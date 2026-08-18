import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { fetchJson, fetchParsedText } from '../src/discovery/http.js'
import * as awesomeDshPlugins from '../src/discovery/sources/awesome-dsh-plugins.js'

test('fetchJson retries retryable HTTP responses before succeeding', async () => {
  let attempts = 0
  const delays = []
  const fetchImpl = async () => {
    attempts += 1
    if (attempts < 3) return new Response('unavailable', { status: 503 })
    return Response.json({ ok: true })
  }

  const result = await fetchJson('https://example.test/catalog.json', {
    fetchImpl,
    maxRetries: 2,
    retryDelayMs: 250,
    sleepImpl: async (delay) => { delays.push(delay) },
  })

  assert.deepEqual(result, { ok: true })
  assert.equal(attempts, 3)
  assert.deepEqual(delays, [250, 500])
})

test('fetchJson honors Retry-After on a retryable response', async () => {
  let attempts = 0
  const delays = []
  const fetchImpl = async () => {
    attempts += 1
    if (attempts === 1) {
      return new Response('limited', { status: 429, headers: { 'retry-after': '2' } })
    }
    return Response.json({ ok: true })
  }

  await fetchJson('https://example.test/catalog.json', {
    fetchImpl,
    maxRetries: 1,
    sleepImpl: async (delay) => { delays.push(delay) },
  })

  assert.deepEqual(delays, [2_000])
})

test('fetchJson does not retry a permanent HTTP response', async () => {
  let attempts = 0
  const fetchImpl = async () => {
    attempts += 1
    return new Response('missing', { status: 404 })
  }

  await assert.rejects(
    fetchJson('https://example.test/missing.json', {
      fetchImpl,
      maxRetries: 2,
      sleepImpl: async () => { throw new Error('must not sleep') },
    }),
    /HTTP 404 after 1 attempt/,
  )
  assert.equal(attempts, 1)
})

test('fetchJson reports the network cause and an invalid proxy setting', async () => {
  const networkError = new TypeError('fetch failed', {
    cause: Object.assign(new Error('getaddrinfo ENOTFOUND example.test'), { code: 'ENOTFOUND' }),
  })

  await assert.rejects(
    fetchJson('https://example.test/catalog.json', {
      fetchImpl: async () => { throw networkError },
      maxRetries: 0,
      env: {
        http_proxy: 'http://127.0.0.1:7890export',
        https_proxy: 'http://127.0.0.1:7890',
      },
    }),
    (error) => {
      assert.match(error.message, /ENOTFOUND/)
      assert.match(error.message, /invalid http_proxy/)
      assert.match(error.message, /NODE_USE_ENV_PROXY=1/)
      return true
    },
  )
})

test('fetchParsedText replaces a cached payload rejected by its parser', async (t) => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'dsh-capability-cache-parser-test-'))
  t.after(() => rm(cacheDir, { recursive: true, force: true }))
  let attempts = 0
  const fetchImpl = async () => {
    attempts += 1
    return new Response(attempts === 1 ? 'stale format' : 'current format')
  }
  const options = { fetchImpl, cacheDir, cacheTtlMs: 5 * 60 * 1_000, now: () => 1_000 }

  await fetchParsedText('https://example.test/catalog.js', (body) => body, options)
  const result = await fetchParsedText('https://example.test/catalog.js', (body) => {
    if (body !== 'current format') throw new Error('unexpected catalog format')
    return body
  }, options)

  assert.equal(result, 'current format')
  assert.equal(attempts, 2)
})

test('static catalog adapters reuse a five-minute disk cache across calls', async (t) => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'dsh-capability-cache-test-'))
  const previousCacheDir = process.env.CAPABILITY_DISCOVERY_CACHE_DIR
  process.env.CAPABILITY_DISCOVERY_CACHE_DIR = cacheDir
  t.after(() => {
    if (previousCacheDir === undefined) delete process.env.CAPABILITY_DISCOVERY_CACHE_DIR
    else process.env.CAPABILITY_DISCOVERY_CACHE_DIR = previousCacheDir
  })
  t.after(() => rm(cacheDir, { recursive: true, force: true }))
  let attempts = 0
  const fetchImpl = async () => {
    attempts += 1
    if (attempts > 1) throw new Error('network must not be used while cache is fresh')
    return new Response('window.__DSH_DATA__ = {"plugins":[{"owner":"acme","repo":"slides","url":"https://github.com/acme/slides"}]};')
  }
  const options = { fetchImpl, now: () => 1_000 }

  const first = await awesomeDshPlugins.search(options)
  const second = await awesomeDshPlugins.search(options)

  assert.equal(attempts, 1)
  assert.deepEqual(second, first)
})

test('static catalog cache expires after five minutes', async (t) => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'dsh-capability-cache-expiry-test-'))
  t.after(() => rm(cacheDir, { recursive: true, force: true }))
  let attempts = 0
  let currentTime = 1_000
  const fetchImpl = async () => {
    attempts += 1
    return new Response(`window.__DSH_DATA__ = {"plugins":[{"owner":"acme","repo":"slides-v${attempts}","url":"https://github.com/acme/slides-v${attempts}"}]};`)
  }
  const options = { fetchImpl, cacheDir, now: () => currentTime }

  const first = await awesomeDshPlugins.search(options)
  currentTime += 5 * 60 * 1_000 + 1
  const second = await awesomeDshPlugins.search(options)

  assert.equal(attempts, 2)
  assert.equal(first[0].fullName, 'acme/slides-v1')
  assert.equal(second[0].fullName, 'acme/slides-v2')
})
