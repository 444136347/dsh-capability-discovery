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

test('discoverCapabilities limits MCP searches to explicit server candidates', async () => {
  const sources = [{
    name: 'catalog',
    search: async () => [
      {
        fullName: 'PerryLink/dsh-mcp-panel',
        description: 'MCP management console for the official DeepSeek Harness MCP client.',
        type: 'mcp',
      },
      {
        fullName: 'gxpppp/dsh-search-mcp',
        description: "Replace DSH's built-in web search with search MCP servers.",
        type: 'mcp',
      },
      {
        fullName: 'bobleer/deepseek-harness-plugin-mcp',
        description: 'MCP server that lets any agent discover and run DSH plugins.',
        type: 'plugin',
      },
    ],
  }]

  const result = await discoverCapabilities({ query: 'mcp server', type: 'mcp', sources, limit: 5 })

  assert.deepEqual(result.results.map((item) => item.fullName), ['bobleer/deepseek-harness-plugin-mcp'])
  assert.equal(result.results[0].mcpRole, 'server')
})
