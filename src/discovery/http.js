import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const RETRYABLE_HTTP_STATUSES = new Set([429, 502, 503, 504])
const DEFAULT_MAX_RETRIES = 2
const DEFAULT_RETRY_DELAY_MS = 250

export const STATIC_SOURCE_CACHE_TTL_MS = 5 * 60 * 1_000

export function githubHeaders(token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? '') {
  const headers = {
    accept: 'application/vnd.github+json',
    'user-agent': 'dsh-capability-discovery',
    'x-github-api-version': '2022-11-28',
  }
  if (token) headers.authorization = `Bearer ${token}`
  return headers
}

function attemptLabel(count) {
  return `${count} attempt${count === 1 ? '' : 's'}`
}

function retryDelay(response, attempt, retryDelayMs, now) {
  const retryAfter = response.headers.get('retry-after')
  if (retryAfter) {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000

    const date = Date.parse(retryAfter)
    if (Number.isFinite(date)) return Math.max(0, date - now())
  }
  return retryDelayMs * (2 ** (attempt - 1))
}

function proxyDiagnostics(env) {
  const entries = [
    ['HTTP_PROXY', env.HTTP_PROXY ?? env.http_proxy],
    ['HTTPS_PROXY', env.HTTPS_PROXY ?? env.https_proxy],
  ]
  const diagnostics = []
  let hasProxy = false

  for (const [name, value] of entries) {
    if (!value) continue
    hasProxy = true
    try {
      const parsed = new URL(value)
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('unsupported protocol')
    } catch {
      diagnostics.push(`invalid ${name.toLowerCase()}`)
    }
  }

  if (hasProxy && env.NODE_USE_ENV_PROXY !== '1') {
    diagnostics.push('set NODE_USE_ENV_PROXY=1 for Node fetch to use HTTP(S)_PROXY')
  }
  return diagnostics
}

function networkErrorMessage(url, error, attempts, env) {
  const details = []
  if (error instanceof Error) {
    details.push(error.message)
    const cause = error.cause
    if (cause && typeof cause === 'object') {
      if (cause.code && !details.some((item) => item.includes(String(cause.code)))) {
        details.push(String(cause.code))
      }
      if (cause.message && !details.includes(String(cause.message))) {
        details.push(String(cause.message))
      }
    }
  } else {
    details.push(String(error))
  }
  details.push(...proxyDiagnostics(env))
  return `${url} request failed after ${attemptLabel(attempts)}: ${details.join('; ')}`
}

function cachePath(url, kind, cacheDir) {
  const key = createHash('sha256').update(`${kind}:${url}`).digest('hex')
  return join(cacheDir, `${key}.json`)
}

async function readCachedBody(file, cacheTtlMs, now) {
  if (!(cacheTtlMs > 0)) return null
  try {
    const cached = JSON.parse(await readFile(file, 'utf8'))
    if (typeof cached.body !== 'string' || !Number.isFinite(cached.storedAt)) return null
    if (now() - cached.storedAt >= cacheTtlMs) return null
    return cached.body
  } catch {
    // Missing, stale, or malformed cache files should fall back to the network.
    return null
  }
}

async function writeCachedBody(file, body, now) {
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`
  try {
    await mkdir(dirname(file), { recursive: true })
    await writeFile(temporary, JSON.stringify({ storedAt: now(), body }), 'utf8')
    await rename(temporary, file)
  } catch {
    // Cache writes are optional and must not turn a successful source request into a failure.
  }
}

async function requestBody(url, {
  fetchImpl = fetch,
  headers = {},
  timeoutMs = 20_000,
  maxRetries = DEFAULT_MAX_RETRIES,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  sleepImpl = (delay) => new Promise((resolve) => setTimeout(resolve, delay)),
  env = process.env,
  cacheTtlMs = 0,
  cacheDir = env.CAPABILITY_DISCOVERY_CACHE_DIR ?? join(tmpdir(), 'dsh-capability-discovery-cache'),
  now = Date.now,
  kind,
  parse,
} = {}) {
  const requestUrl = String(url)
  const file = cachePath(requestUrl, kind, cacheDir)
  const cachedBody = await readCachedBody(file, cacheTtlMs, now)
  if (cachedBody !== null) {
    try {
      return parse(cachedBody)
    } catch {
      // A cache entry with an invalid payload is ignored and replaced from the network.
    }
  }

  const retries = Math.max(0, Math.trunc(Number(maxRetries) || 0))
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    let response
    try {
      response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(timeoutMs) })
    } catch (error) {
      if (attempt <= retries) {
        await sleepImpl(retryDelayMs * (2 ** (attempt - 1)))
        continue
      }
      throw new Error(networkErrorMessage(requestUrl, error, attempt, env), { cause: error })
    }

    if (!response.ok) {
      if (RETRYABLE_HTTP_STATUSES.has(response.status) && attempt <= retries) {
        await response.body?.cancel().catch(() => {})
        await sleepImpl(retryDelay(response, attempt, retryDelayMs, now))
        continue
      }
      throw new Error(`${requestUrl} returned HTTP ${response.status} after ${attemptLabel(attempt)}`)
    }

    const body = await response.text()
    const parsed = parse(body)
    if (cacheTtlMs > 0) await writeCachedBody(file, body, now)
    return parsed
  }

  throw new Error(`${requestUrl} request failed without an attempt`)
}

export async function fetchJson(url, options = {}) {
  return requestBody(url, { ...options, kind: 'json', parse: JSON.parse })
}

export async function fetchText(url, options = {}) {
  return requestBody(url, { ...options, kind: 'text', parse: (body) => body })
}

export async function fetchParsedText(url, parse, options = {}) {
  if (typeof parse !== 'function') throw new TypeError('parse must be a function')
  return requestBody(url, { ...options, kind: 'text', parse })
}
