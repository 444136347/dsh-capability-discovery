import { fetchJson, githubHeaders } from '../http.js'

export const name = 'github-dsh-plugin-topic'

export async function search({ query = '', fetchImpl = fetch, token } = {}) {
  const url = new URL('https://api.github.com/search/repositories')
  const terms = String(query).trim()
  url.searchParams.set('q', `topic:dsh-plugin is:public archived:false${terms ? ` ${terms}` : ''}`)
  url.searchParams.set('sort', terms ? 'stars' : 'updated')
  url.searchParams.set('order', 'desc')
  url.searchParams.set('per_page', '100')

  const body = await fetchJson(url, { fetchImpl, headers: githubHeaders(token) })
  return (body.items ?? []).filter((repo) => !repo.fork && !repo.archived && !repo.disabled).map((repo) => ({
    fullName: repo.full_name,
    name: repo.name,
    url: repo.html_url,
    description: repo.description ?? '',
    stars: repo.stargazers_count ?? 0,
    pushedAt: repo.pushed_at ?? null,
    license: repo.license?.spdx_id ?? null,
    type: 'plugin',
    category: 'GitHub dsh-plugin topic',
  }))
}
