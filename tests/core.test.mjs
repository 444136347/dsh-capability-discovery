import test from 'node:test'
import assert from 'node:assert/strict'

import { mergeCandidates, rankCandidates } from '../src/core/candidates.js'

test('mergeCandidates deduplicates repositories and records every source', () => {
  const merged = mergeCandidates([
    {
      source: 'github-topic',
      candidates: [{ fullName: 'Acme/PPT', url: 'https://github.com/Acme/PPT', description: 'slides', stars: 10 }],
    },
    {
      source: 'awesome-dsh-plugins',
      candidates: [{ fullName: 'acme/ppt', url: 'https://github.com/acme/ppt', description: 'presentation plugin', npmName: 'acme-ppt' }],
    },
  ])

  assert.equal(merged.length, 1)
  assert.deepEqual(merged[0].sources.sort(), ['awesome-dsh-plugins', 'github-topic'])
  assert.equal(merged[0].stars, 10)
  assert.equal(merged[0].npmName, 'acme-ppt')
})

test('mergeCandidates prefers a specific capability type over a generic plugin type', () => {
  const merged = mergeCandidates([
    {
      source: 'github-topic',
      candidates: [{ fullName: 'acme/slides', url: 'https://github.com/acme/slides', type: 'plugin' }],
    },
    {
      source: 'classified-list',
      candidates: [{ fullName: 'acme/slides', url: 'https://github.com/acme/slides', type: 'skill' }],
    },
  ])

  assert.equal(merged[0].type, 'skill')
})

test('mergeCandidates keeps the first type when two specific types conflict', () => {
  const merged = mergeCandidates([
    {
      source: 'first-list',
      candidates: [{ fullName: 'acme/bridge', url: 'https://github.com/acme/bridge', type: 'skill' }],
    },
    {
      source: 'second-list',
      candidates: [{ fullName: 'acme/bridge', url: 'https://github.com/acme/bridge', type: 'mcp' }],
    },
  ])

  assert.equal(merged[0].type, 'skill')
})

test('rankCandidates rewards relevance and multi-source agreement', () => {
  const ranked = rankCandidates([
    { fullName: 'a/ppt-helper', description: 'make powerpoint slides', sources: ['github-topic', 'awesome'], stars: 3, pushedAt: '2026-08-16T00:00:00Z' },
    { fullName: 'b/git-tool', description: 'git utility', sources: ['github-topic'], stars: 5000, pushedAt: '2026-08-16T00:00:00Z' },
  ], ['ppt', 'slides'], { now: new Date('2026-08-17T00:00:00Z') })

  assert.equal(ranked[0].fullName, 'a/ppt-helper')
  assert.ok(ranked[0].score > ranked[1].score)
})
