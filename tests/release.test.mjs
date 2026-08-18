import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const releaseVersion = '0.1.0'
const releaseTag = `v${releaseVersion}`
const releaseDate = '2026-08-19'

async function read(path) {
  return readFile(join(root, path), 'utf8')
}

test('package and public documentation identify the first public release as v0.1.0', async () => {
  const manifest = JSON.parse(await read('package.json'))
  assert.equal(manifest.version, releaseVersion)

  for (const path of ['README.md', 'README.zh-CN.md', 'docs/publishing.md', 'docs/publishing.zh-CN.md']) {
    const content = await read(path)
    assert.ok(content.includes(releaseTag), `${path} must reference ${releaseTag}`)
    assert.doesNotMatch(content, /v0\.1\.[1-9]\d*/)
  }
})

test('English and Chinese changelogs expose one dated v0.1.0 release', async () => {
  const english = await read('CHANGELOG.md')
  const chinese = await read('CHANGELOG.zh-CN.md')

  assert.match(english, new RegExp(`^## ${releaseVersion} - ${releaseDate}$`, 'm'))
  assert.match(chinese, new RegExp(`^## ${releaseVersion} - ${releaseDate}$`, 'm'))
  assert.doesNotMatch(english, /^## Unreleased$/m)
  assert.doesNotMatch(chinese, /^## 尚未发布$/m)
  assert.doesNotMatch(`${english}\n${chinese}`, /0\.1\.[1-9]\d*/)
})
