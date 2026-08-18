import test from 'node:test'
import assert from 'node:assert/strict'

import { discoverCapabilities } from '../src/discovery/index.js'

test('discoverCapabilities continues when one source fails', async () => {
  const sources = [
    { name: 'good', search: async () => [{ fullName: 'foo/slides', url: 'https://github.com/foo/slides', description: 'slides skill', stars: 2 }] },
    { name: 'bad', search: async () => { throw new Error('offline') } },
  ]
  const result = await discoverCapabilities({ query: 'slides', limit: 5, sources })
  assert.equal(result.results.length, 1)
  assert.equal(result.results[0].fullName, 'foo/slides')
  assert.equal(result.sourceErrors.length, 1)
  assert.equal(result.sourceErrors[0].source, 'bad')
})

test('discoverCapabilities omits candidates with no query term match', async () => {
  const sources = [{
    name: 'catalog',
    search: async () => [
      { fullName: 'popular/database', description: 'backup storage', stars: 9000, type: 'plugin' },
      { fullName: 'small/slides', description: 'presentation helper', stars: 0, type: 'plugin' },
    ],
  }]

  const result = await discoverCapabilities({ query: 'slides', sources, limit: 5 })

  assert.deepEqual(result.results.map((item) => item.fullName), ['small/slides'])
})

test('discoverCapabilities returns no candidates for an empty library query', async () => {
  const sources = [{
    name: 'catalog',
    search: async () => [
      { fullName: 'popular/database', description: 'backup storage', stars: 9000, type: 'plugin' },
    ],
  }]

  const result = await discoverCapabilities({ query: '', sources, limit: 5 })

  assert.deepEqual(result.results, [])
})
