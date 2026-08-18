function clean(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function repoFromGitHubUrl(url) {
  if (typeof url !== 'string') return null
  const match = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/#?]+?)(?:\.git)?(?:[/?#].*)?$/i)
  if (!match) return null
  return `${match[1]}/${match[2]}`
}

function richness(candidate) {
  return [candidate.description, candidate.pushedAt, candidate.license, candidate.npmName, candidate.category].filter(Boolean).length
}

const GENERIC_TYPES = new Set(['plugin', 'unknown'])

function preferredType(current, incoming) {
  const currentIsGeneric = !current || GENERIC_TYPES.has(current)
  const incomingIsSpecific = Boolean(incoming) && !GENERIC_TYPES.has(incoming)
  if (currentIsGeneric && incomingIsSpecific) return incoming
  return current ?? incoming ?? 'plugin'
}

export function mergeCandidates(sourceResults) {
  const map = new Map()

  for (const group of sourceResults) {
    for (const raw of group.candidates ?? []) {
      const fromUrl = repoFromGitHubUrl(raw.url)
      const fullName = clean(fromUrl ?? raw.fullName)
      if (!fullName || !fullName.includes('/')) continue
      const key = fullName.toLowerCase()
      const incoming = {
        ...raw,
        fullName,
        name: clean(raw.name) ?? fullName.split('/')[1],
        url: clean(raw.url) ?? `https://github.com/${fullName}`,
        description: clean(raw.description) ?? '',
        stars: Number.isFinite(raw.stars) ? raw.stars : 0,
        sources: [group.source],
      }

      if (!map.has(key)) {
        map.set(key, incoming)
        continue
      }

      const current = map.get(key)
      const preferred = richness(incoming) > richness(current) ? incoming : current
      map.set(key, {
        ...current,
        ...preferred,
        description: current.description.length >= incoming.description.length ? current.description : incoming.description,
        stars: Math.max(current.stars ?? 0, incoming.stars ?? 0),
        pushedAt: current.pushedAt && incoming.pushedAt
          ? (new Date(current.pushedAt) >= new Date(incoming.pushedAt) ? current.pushedAt : incoming.pushedAt)
          : current.pushedAt ?? incoming.pushedAt ?? null,
        license: current.license ?? incoming.license ?? null,
        npmName: current.npmName ?? incoming.npmName ?? null,
        category: current.category ?? incoming.category ?? null,
        type: preferredType(current.type, incoming.type),
        sources: [...new Set([...(current.sources ?? []), group.source])],
      })
    }
  }

  return [...map.values()]
}

export function candidateMatchesTerms(candidate, terms) {
  const normalizedTerms = [...new Set(terms.map((term) => term.trim().toLowerCase()).filter(Boolean))]
  if (!normalizedTerms.length) return false
  const text = [candidate.fullName, candidate.name, candidate.description, candidate.category, candidate.type]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return normalizedTerms.some((term) => text.includes(term))
}

function ageScore(pushedAt, now) {
  if (!pushedAt) return 0
  const ageDays = Math.max(0, (now.getTime() - new Date(pushedAt).getTime()) / 86_400_000)
  if (ageDays <= 30) return 10
  if (ageDays <= 90) return 7
  if (ageDays <= 365) return 4
  return 1
}

export function scoreCandidate(candidate, terms, { now = new Date() } = {}) {
  const normalizedTerms = [...new Set(terms.map((term) => term.trim().toLowerCase()).filter(Boolean))]
  const name = `${candidate.fullName ?? ''} ${candidate.name ?? ''}`.toLowerCase()
  const body = `${candidate.description ?? ''} ${candidate.category ?? ''} ${candidate.type ?? ''}`.toLowerCase()

  let relevance = 0
  for (const term of normalizedTerms) {
    if (name.includes(term)) relevance += 24
    if (body.includes(term)) relevance += 16
  }
  relevance = Math.min(60, relevance)

  const sourceAgreement = Math.min(18, Math.max(0, (candidate.sources?.length ?? 1) - 1) * 9)
  const popularity = Math.min(12, Math.log10((candidate.stars ?? 0) + 1) * 3)
  const freshness = ageScore(candidate.pushedAt, now)
  const curatedBonus = (candidate.sources ?? []).some((source) => source.includes('awesome')) ? 3 : 0

  return Math.round((relevance + sourceAgreement + popularity + freshness + curatedBonus) * 10) / 10
}

export function rankCandidates(candidates, terms, options = {}) {
  return candidates
    .map((candidate) => ({ ...candidate, score: scoreCandidate(candidate, terms, options) }))
    .sort((a, b) => b.score - a.score || (b.stars ?? 0) - (a.stars ?? 0) || a.fullName.localeCompare(b.fullName))
}
