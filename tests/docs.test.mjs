import assert from 'node:assert/strict'
import { access, readFile, readdir } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

const documentPairs = [
  ['README.md', 'README.zh-CN.md'],
  ['docs/architecture.md', 'docs/architecture.zh-CN.md'],
  ['docs/sources.md', 'docs/sources.zh-CN.md'],
  ['docs/publishing.md', 'docs/publishing.zh-CN.md'],
  ['CONTRIBUTING.md', 'CONTRIBUTING.zh-CN.md'],
  ['SECURITY.md', 'SECURITY.zh-CN.md'],
  ['CHANGELOG.md', 'CHANGELOG.zh-CN.md'],
]

function markdownLink(from, to) {
  const path = relative(dirname(from), to).replaceAll('\\', '/')
  return path.startsWith('.') ? path : `./${path}`
}

async function markdownFiles(directory = root) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await markdownFiles(path))
    else if (extname(entry.name) === '.md') files.push(path)
  }
  return files
}

test('public documentation has English and Chinese pairs with reciprocal links', async () => {
  for (const [englishPath, chinesePath] of documentPairs) {
    const english = await readFile(join(root, englishPath), 'utf8')
    const chinese = await readFile(join(root, chinesePath), 'utf8')

    assert.match(english, new RegExp(`\\(${markdownLink(englishPath, chinesePath).replaceAll('.', '\\.') }\\)`))
    assert.match(chinese, new RegExp(`\\(${markdownLink(chinesePath, englishPath).replaceAll('.', '\\.') }\\)`))
  }
})

test('Chinese README links to the Chinese documentation set', async () => {
  const readme = await readFile(join(root, 'README.zh-CN.md'), 'utf8')

  for (const path of documentPairs.slice(1).map(([, chinesePath]) => chinesePath)) {
    assert.ok(readme.includes(`(${markdownLink('README.zh-CN.md', path)})`), `missing Chinese README link to ${path}`)
  }
})

test('all local Markdown links resolve to existing files', async () => {
  for (const file of await markdownFiles()) {
    const markdown = await readFile(file, 'utf8')
    for (const match of markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const destination = match[1].split('#', 1)[0]
      if (!destination || /^[a-z][a-z\d+.-]*:/i.test(destination)) continue
      const target = resolve(dirname(file), decodeURI(destination))
      await assert.doesNotReject(access(target), `${relative(root, file)} links to missing ${destination}`)
    }
  }
})

test('package file allowlist includes linked English and Chinese documentation', async () => {
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  const required = [
    'docs/architecture.md',
    'docs/architecture.zh-CN.md',
    'docs/sources.md',
    'docs/sources.zh-CN.md',
    'docs/publishing.md',
    'docs/publishing.zh-CN.md',
    'CHANGELOG.md',
    'CHANGELOG.zh-CN.md',
    'CONTRIBUTING.md',
    'CONTRIBUTING.zh-CN.md',
    'SECURITY.md',
    'SECURITY.zh-CN.md',
  ]

  for (const path of required) {
    assert.ok(manifest.files.includes(path), `package files must include ${path}`)
  }
})
