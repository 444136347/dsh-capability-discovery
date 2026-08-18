import test from 'node:test'
import assert from 'node:assert/strict'

import {
  parseAwesomeDshPlugins,
  parseAwesomeDshPluginsScript,
} from '../src/discovery/sources/awesome-dsh-plugins.js'
import { parseAwesomeDeepseekHarness } from '../src/discovery/sources/awesome-deepseek-harness.js'
import { parseAwesomeRegistry } from '../src/discovery/sources/awesome-registry.js'

test('parseAwesomeDshPlugins normalizes structured JSON entries', () => {
  const candidates = parseAwesomeDshPlugins({ plugins: [{ fullName: 'x/y', url: 'https://github.com/x/y', description: 'tool', stars: 8, npmName: 'pkg', category: { id: 'tools', title: 'Tools' } }] })
  assert.deepEqual(candidates[0], {
    fullName: 'x/y',
    name: 'y',
    url: 'https://github.com/x/y',
    description: 'tool',
    stars: 8,
    pushedAt: null,
    license: null,
    npmName: 'pkg',
    type: 'plugin',
    category: 'Tools',
  })
})

test('parseAwesomeDshPluginsScript reads the upstream web data assignment', () => {
  const script = `// generated file
window.__DSH_DATA__ = {
  "plugins": [{
    "name": "slides-tool",
    "owner": "acme",
    "repo": "slides-tool",
    "url": "https://github.com/acme/slides-tool",
    "description": "Build slides",
    "stars": 12,
    "category": "skills"
  }]
};
`

  assert.deepEqual(parseAwesomeDshPluginsScript(script)[0], {
    fullName: 'acme/slides-tool',
    name: 'slides-tool',
    url: 'https://github.com/acme/slides-tool',
    description: 'Build slides',
    stars: 12,
    pushedAt: null,
    license: null,
    npmName: null,
    type: 'plugin',
    category: 'skills',
  })
})

test('parseAwesomeDshPluginsScript rejects unrelated JavaScript', () => {
  assert.throws(
    () => parseAwesomeDshPluginsScript('globalThis.evil = true'),
    /window\.__DSH_DATA__/,
  )
})

test('parseAwesomeDeepseekHarness reads repository links under capability headings', () => {
  const markdown = `## Skills\n- [foo/bar](https://github.com/foo/bar) — skill for slides. \`⭐42\`\n\n## MCP Servers\n- [mcp/co](https://github.com/mcp/co) — MCP bridge.\n\n## Resources\n- [Issue](https://github.com/foo/bar/issues/1) — not a repository.\n`
  const candidates = parseAwesomeDeepseekHarness(markdown)
  assert.equal(candidates.length, 2)
  assert.equal(candidates[0].fullName, 'foo/bar')
  assert.equal(candidates[0].type, 'skill')
  assert.equal(candidates[0].stars, 42)
  assert.equal(candidates[1].type, 'mcp')
})

test('parseAwesomeRegistry accepts array and object plugin registries', () => {
  const fromArray = parseAwesomeRegistry([{ repo: 'foo/bar', url: 'https://github.com/foo/bar', description: 'x' }])
  const fromObject = parseAwesomeRegistry({ plugins: [{ fullName: 'a/b', url: 'https://github.com/a/b', description: 'y' }] })
  assert.equal(fromArray[0].fullName, 'foo/bar')
  assert.equal(fromObject[0].fullName, 'a/b')
})
