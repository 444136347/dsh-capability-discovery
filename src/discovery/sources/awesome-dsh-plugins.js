import { fetchParsedText, STATIC_SOURCE_CACHE_TTL_MS } from '../http.js'

export const name = 'awesome-dsh-plugins'
export const sourceUrl = 'https://raw.githubusercontent.com/kejixiaoliang/awesome-dsh-plugins/main/web/data.js'

export function parseAwesomeDshPlugins(body) {
  return (body?.plugins ?? []).filter((item) => item?.fullName || item?.url).map((item) => ({
    fullName: item.fullName ?? (item.owner && item.repo ? `${item.owner}/${item.repo}` : null),
    name: item.name ?? item.repo ?? item.fullName?.split('/')[1] ?? null,
    url: item.url,
    description: item.description ?? '',
    stars: Number.isFinite(item.stars) ? item.stars : 0,
    pushedAt: item.pushedAt ?? null,
    license: item.license ?? null,
    npmName: item.npmName ?? null,
    type: item.isPlugin === false ? 'unknown' : 'plugin',
    category: typeof item.category === 'string'
      ? item.category
      : item.category?.title ?? item.category?.id ?? null,
  }))
}

export function parseAwesomeDshPluginsScript(script) {
  const match = String(script).match(/^\s*(?:\/\/[^\n]*\n\s*)*window\.__DSH_DATA__\s*=\s*([\s\S]*?)\s*;?\s*$/)
  if (!match) {
    throw new Error('Invalid awesome-dsh-plugins payload: expected window.__DSH_DATA__ assignment')
  }
  return parseAwesomeDshPlugins(JSON.parse(match[1]))
}

export async function search({ fetchImpl = fetch, cacheDir, now, sleepImpl } = {}) {
  return fetchParsedText(sourceUrl, parseAwesomeDshPluginsScript, {
    fetchImpl,
    cacheDir,
    now,
    sleepImpl,
    cacheTtlMs: STATIC_SOURCE_CACHE_TTL_MS,
  })
}
