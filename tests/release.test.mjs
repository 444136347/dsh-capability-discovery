import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const firstReleaseVersion = '0.1.0'
const currentVersion = '0.1.1'
const currentTag = `v${currentVersion}`

async function read(path) {
  return readFile(join(root, path), 'utf8')
}

test('package and public documentation identify v0.1.1 as the current release', async () => {
  const manifest = JSON.parse(await read('package.json'))
  assert.equal(manifest.version, currentVersion)

  for (const path of ['README.md', 'README.zh-CN.md', 'docs/publishing.md', 'docs/publishing.zh-CN.md']) {
    const content = await read(path)
    assert.ok(content.includes(currentTag), `${path} must reference ${currentTag}`)
  }
})

test('English and Chinese changelogs retain v0.1.0 and add v0.1.1', async () => {
  const english = await read('CHANGELOG.md')
  const chinese = await read('CHANGELOG.zh-CN.md')

  for (const changelog of [english, chinese]) {
    assert.match(changelog, new RegExp(`^## ${currentVersion} - 2026-08-20$`, 'm'))
    assert.match(changelog, new RegExp(`^## ${firstReleaseVersion} - 2026-08-19$`, 'm'))
  }
  assert.doesNotMatch(english, /^## Unreleased$/m)
  assert.doesNotMatch(chinese, /^## 尚未发布$/m)
})
