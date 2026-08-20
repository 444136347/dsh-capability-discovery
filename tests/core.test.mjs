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

test('mergeCandidates keeps an MCP management console classified as a plugin', () => {
  const merged = mergeCandidates([
    {
      source: 'github-topic',
      candidates: [{
        fullName: 'PerryLink/dsh-mcp-panel',
        url: 'https://github.com/PerryLink/dsh-mcp-panel',
        description: 'MCP management console for the official DeepSeek Harness MCP client.',
        type: 'plugin',
      }],
    },
    {
      source: 'mcp-heading',
      candidates: [{
        fullName: 'PerryLink/dsh-mcp-panel',
        url: 'https://github.com/PerryLink/dsh-mcp-panel',
        description: 'MCP management console for the official DeepSeek Harness MCP client.',
        type: 'mcp',
      }],
    },
  ])

  assert.equal(merged[0].type, 'plugin')
  assert.equal(merged[0].mcpRole, 'manager')
})

test('mergeCandidates keeps an MCP-backed search integration classified as a plugin', () => {
  const merged = mergeCandidates([
    {
      source: 'mcp-heading',
      candidates: [{
        fullName: 'gxpppp/dsh-search-mcp',
        url: 'https://github.com/gxpppp/dsh-search-mcp',
        description: "Replace DSH's built-in web search with search MCP servers.",
        type: 'mcp',
      }],
    },
  ])

  assert.equal(merged[0].type, 'plugin')
  assert.equal(merged[0].mcpRole, 'client')
})

test('mergeCandidates classifies an explicitly declared MCP server as MCP', () => {
  const merged = mergeCandidates([
    {
      source: 'github-topic',
      candidates: [{
        fullName: 'bobleer/deepseek-harness-plugin-mcp',
        url: 'https://github.com/bobleer/deepseek-harness-plugin-mcp',
        description: 'MCP server that lets any agent discover, install, and run DSH plugins.',
        type: 'plugin',
      }],
    },
  ])

  assert.equal(merged[0].type, 'mcp')
  assert.equal(merged[0].mcpRole, 'server')
})

test('mergeCandidates does not treat an MCP server bridge as a server', () => {
  const merged = mergeCandidates([
    {
      source: 'github-topic',
      candidates: [{
        fullName: 'Heath96/dsh-heath-mcp',
        url: 'https://github.com/Heath96/dsh-heath-mcp',
        description: 'MCP server bridge for DeepSeek Harness with stdio and HTTP transports.',
        type: 'mcp',
      }],
    },
  ])

  assert.equal(merged[0].type, 'plugin')
  assert.equal(merged[0].mcpRole, 'bridge')
})

test('rankCandidates rewards relevance and multi-source agreement', () => {
  const ranked = rankCandidates([
    { fullName: 'a/ppt-helper', description: 'make powerpoint slides', sources: ['github-topic', 'awesome'], stars: 3, pushedAt: '2026-08-16T00:00:00Z' },
    { fullName: 'b/git-tool', description: 'git utility', sources: ['github-topic'], stars: 5000, pushedAt: '2026-08-16T00:00:00Z' },
  ], ['ppt', 'slides'], { now: new Date('2026-08-17T00:00:00Z') })

  assert.equal(ranked[0].fullName, 'a/ppt-helper')
  assert.ok(ranked[0].score > ranked[1].score)
})
