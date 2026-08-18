import { candidateMatchesTerms, mergeCandidates, rankCandidates } from '../core/candidates.js'
import * as githubTopic from './sources/github-topic.js'
import * as awesomeDshPlugins from './sources/awesome-dsh-plugins.js'
import * as awesomeDeepseekHarness from './sources/awesome-deepseek-harness.js'
import * as awesomeRegistry from './sources/awesome-registry.js'

export const defaultSources = [githubTopic, awesomeDshPlugins, awesomeDeepseekHarness, awesomeRegistry]

export async function discoverCapabilities({
  query,
  limit = 10,
  type = null,
  sources = defaultSources,
  fetchImpl = fetch,
  token,
  cacheDir,
  now,
  sleepImpl,
} = {}) {
  const terms = String(query ?? '').trim().split(/\s+/).filter(Boolean)
  const settled = await Promise.all(sources.map(async (source) => {
    try {
      const candidates = await source.search({ query, fetchImpl, token, cacheDir, now, sleepImpl })
      return { ok: true, source: source.name, candidates }
    } catch (error) {
      return { ok: false, source: source.name, error: error instanceof Error ? error.message : String(error) }
    }
  }))

  const successful = settled.filter((item) => item.ok).map((item) => ({ source: item.source, candidates: item.candidates }))
  const sourceErrors = settled.filter((item) => !item.ok).map((item) => ({ source: item.source, error: item.error }))
  const merged = mergeCandidates(successful)
  const typed = type ? merged.filter((candidate) => candidate.type === type) : merged
  const relevant = typed.filter((candidate) => candidateMatchesTerms(candidate, terms))
  const ranked = rankCandidates(relevant, terms).slice(0, Math.max(1, Math.min(Number(limit) || 10, 50)))

  return {
    query: String(query ?? ''),
    type,
    generatedAt: new Date().toISOString(),
    sourceSummary: settled.map((item) => ({ source: item.source, ok: item.ok, count: item.ok ? item.candidates.length : 0 })),
    sourceErrors,
    results: ranked,
  }
}
