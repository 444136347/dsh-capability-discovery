import { fetchJson, fetchText, githubHeaders } from '../discovery/http.js'
import { scanRepositoryFiles } from './scan.js'

const FILE_PATTERN = /(?:^package\.json$|(?:^|\/)(?:SKILL|AGENTS|CLAUDE|GEMINI)\.md$|\.(?:js|mjs|cjs|ts|tsx|jsx|sh|bash|py|rb|go|rs)$)/i
const EXCLUDED = /(?:^|\/)(?:node_modules|dist|build|coverage|vendor|\.git)\//

export async function inspectGitHubRepository(fullName, { fetchImpl = fetch, token } = {}) {
  if (!/^[^/\s]+\/[^/\s]+$/.test(fullName)) throw new Error('Repository must be in owner/repo form')
  const headers = githubHeaders(token)
  const repo = await fetchJson(`https://api.github.com/repos/${fullName}`, { fetchImpl, headers })
  const branch = repo.default_branch ?? 'main'
  const tree = await fetchJson(`https://api.github.com/repos/${fullName}/git/trees/${encodeURIComponent(branch)}?recursive=1`, { fetchImpl, headers })

  const selected = (tree.tree ?? [])
    .filter((item) => item.type === 'blob' && FILE_PATTERN.test(item.path) && !EXCLUDED.test(item.path) && (item.size ?? 0) <= 120_000)
    .sort((a, b) => {
      const priority = (path) => path === 'package.json' ? 0 : /SKILL\.md$/i.test(path) ? 1 : 2
      return priority(a.path) - priority(b.path) || (a.size ?? 0) - (b.size ?? 0)
    })
    .slice(0, 40)

  const files = []
  for (let i = 0; i < selected.length; i += 8) {
    const batch = selected.slice(i, i + 8)
    const loaded = await Promise.all(batch.map(async (item) => {
      const raw = `https://raw.githubusercontent.com/${fullName}/${encodeURIComponent(branch)}/${item.path.split('/').map(encodeURIComponent).join('/')}`
      try {
        return { path: item.path, content: await fetchText(raw, { fetchImpl, timeoutMs: 15_000 }) }
      } catch {
        return null
      }
    }))
    files.push(...loaded.filter(Boolean))
  }

  const scan = scanRepositoryFiles(files)
  return {
    repository: {
      fullName: repo.full_name ?? fullName,
      url: repo.html_url ?? `https://github.com/${fullName}`,
      stars: repo.stargazers_count ?? 0,
      archived: Boolean(repo.archived),
      pushedAt: repo.pushed_at ?? null,
      license: repo.license?.spdx_id ?? null,
      defaultBranch: branch,
    },
    filesScanned: files.length,
    ...scan,
  }
}
