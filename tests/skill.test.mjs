import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const skillFile = new URL('../skills/capability-discovery/SKILL.md', import.meta.url)

async function readSkill() {
  return readFile(skillFile, 'utf8')
}

test('skill limits discovery to one combined search with one conditional retry', async () => {
  const skill = await readSkill()

  assert.match(skill, /Run one combined search/i)
  assert.match(skill, /Do not repeat the same search command/i)
  assert.match(skill, /retry once only if the first search returns no relevant candidates/i)
})

test('skill requires a compact Markdown result table', async () => {
  const skill = await readSkill()

  assert.match(skill, /Use this exact compact order/i)
  assert.match(skill, /Candidate \| Evidence \| Best for/i)
  assert.match(skill, /候选 \| 证据 \| 适用场景/)
  assert.match(skill, /Display only the repository name without its owner/i)
  assert.match(skill, /plugin · relevance 66\.9 · GitHub ★1/i)
  assert.match(skill, /插件 · 相关度 66\.9 · GitHub ★1/)
  assert.match(skill, /GitHub Stars, not a rating/i)
  assert.match(skill, /Keep each `Best for` cell to one short phrase/i)
  assert.match(skill, /Return at most three candidates/i)
  assert.match(skill, /Do not generate HTML by default/i)
})

test('skill keeps diagnostics out of the default answer', async () => {
  const skill = await readSkill()

  assert.match(skill, /Show a full per-source table only when the user explicitly asks/i)
  assert.match(skill, /Do not list successful source names/i)
  assert.match(skill, /Do not show search commands unless the user explicitly asks/i)
  assert.match(skill, /Do not include absolute local paths, CLI existence checks, or raw JSON/i)
  assert.match(skill, /Use the user's language for labels and operation status/i)
  assert.match(skill, /Always end with the operation status/i)
})

test('skill does not infer installability from search metadata', async () => {
  const skill = await readSkill()

  assert.match(skill, /Do not claim that any candidate is directly installable/i)
  assert.match(skill, /requires no external runtime/i)
  assert.match(skill, /compatible with the user's profile/i)
  assert.match(skill, /Search metadata alone is insufficient/i)
})

test('skill distinguishes MCP servers from MCP-related integrations', async () => {
  const skill = await readSkill()

  assert.match(skill, /MCP Server searches use the strict `--type mcp` filter/i)
  assert.match(skill, /management console, client, bridge, or other MCP-related integration/i)
  assert.match(skill, /do not use `--type mcp`/i)
})
