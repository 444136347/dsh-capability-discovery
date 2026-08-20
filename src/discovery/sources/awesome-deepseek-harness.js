import {
  fetchParsedTextFromSources,
  githubRawHeaders,
  STATIC_SOURCE_CACHE_TTL_MS,
} from '../http.js'

export const name = 'awesome-deepseek-harness'
export const sourceUrl = 'https://api.github.com/repos/Dominic789654/awesome-deepseek-harness/contents/README.md?ref=main'
export const fallbackSourceUrl = 'https://raw.githubusercontent.com/Dominic789654/awesome-deepseek-harness/main/README.md'

function typeFromHeading(heading) {
  const h = heading.toLowerCase()
  if (h.includes('skill')) return 'skill'
  if (h.includes('mcp')) return 'mcp'
  if (h.includes('profile') || h.includes('patch')) return 'profile'
  if (h.includes('agent')) return 'agent'
  if (h.includes('orchestrator') || h.includes('aggregator')) return 'orchestrator'
  if (h.includes('ui') || h.includes('client') || h.includes('visual')) return 'ui'
  if (h.includes('harness') || h.includes('runtime')) return 'runtime'
  if (h.includes('loop')) return 'workflow'
  return 'plugin'
}

export function parseAwesomeDeepseekHarness(markdown) {
  const out = []
  let heading = ''
  for (const line of String(markdown).split(/\r?\n/)) {
    const headingMatch = line.match(/^##\s+(.+?)\s*$/)
    if (headingMatch) {
      heading = headingMatch[1].replace(/[*`]/g, '').trim()
      continue
    }

    const link = line.match(/^\s*[-*]\s+\[[^\]]+\]\((https:\/\/github\.com\/([^/\s)]+)\/([^/\s)#?]+?)(?:\.git)?)\)(.*)$/i)
    if (!link) continue
    const owner = link[2]
    const repo = link[3]
    if (!owner || !repo || ['issues', 'pull', 'tree', 'blob'].includes(repo.toLowerCase())) continue
    const tail = link[4] ?? ''
    const description = tail.replace(/^\s*[—–-]\s*/, '').replace(/`?⭐\s*\d+`?/g, '').trim()
    const stars = Number(tail.match(/⭐\s*(\d+)/)?.[1] ?? 0)
    out.push({
      fullName: `${owner}/${repo}`,
      name: repo,
      url: `https://github.com/${owner}/${repo}`,
      description,
      stars,
      pushedAt: null,
      license: null,
      npmName: null,
      type: typeFromHeading(heading),
      category: heading || null,
    })
  }
  return out
}

export async function search({ fetchImpl = fetch, token, cacheDir, now, sleepImpl } = {}) {
  return fetchParsedTextFromSources([
    { url: sourceUrl, headers: githubRawHeaders(token) },
    fallbackSourceUrl,
  ], parseAwesomeDeepseekHarness, {
    fetchImpl,
    cacheDir,
    now,
    sleepImpl,
    cacheTtlMs: STATIC_SOURCE_CACHE_TTL_MS,
  })
}
