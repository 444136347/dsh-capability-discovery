import { fetchJson, STATIC_SOURCE_CACHE_TTL_MS } from '../http.js'
import { repoFromGitHubUrl } from '../../core/candidates.js'

export const name = 'awesome-dsh-plugin-registry'
export const sourceUrl = 'https://awesome-dsh-plugin.com/plugins.json'

export function parseAwesomeRegistry(body) {
  const items = Array.isArray(body) ? body : body?.plugins ?? body?.items ?? []
  return items.map((item) => {
    const fullName = item.fullName ?? item.repo ?? item.repository ?? repoFromGitHubUrl(item.url)
    if (!fullName) return null
    return {
      fullName,
      name: item.name ?? fullName.split('/')[1],
      url: item.url ?? `https://github.com/${fullName}`,
      description: item.description ?? item.desc ?? '',
      stars: Number(item.stars ?? 0) || 0,
      pushedAt: item.pushedAt ?? item.updatedAt ?? null,
      license: item.license ?? null,
      npmName: item.npm ?? item.npmName ?? null,
      type: item.type ?? 'plugin',
      category: typeof item.category === 'string' ? item.category : item.category?.title ?? item.category?.id ?? null,
    }
  }).filter(Boolean)
}

export async function search({ fetchImpl = fetch, cacheDir, now, sleepImpl } = {}) {
  return parseAwesomeRegistry(await fetchJson(sourceUrl, {
    fetchImpl,
    cacheDir,
    now,
    sleepImpl,
    cacheTtlMs: STATIC_SOURCE_CACHE_TTL_MS,
  }))
}
