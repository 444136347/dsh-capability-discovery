import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { resolveProfilePackageFile, setupProfileBundle } from '../src/setup/profile.js'

const packageManifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

async function writeProfile(manifest) {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-capability-profile-'))
  const file = join(dir, 'package.json')
  await writeFile(file, JSON.stringify(manifest, null, 2) + '\n')
  return file
}

async function readProfile(file) {
  return JSON.parse(await readFile(file, 'utf8'))
}

test('resolveProfilePackageFile rejects profile names that can escape the profiles directory', () => {
  for (const profile of ['../../outside', '../outside', '.hidden', '.', '..', '']) {
    assert.throws(
      () => resolveProfilePackageFile(profile, { DSH_HOME: '/tmp/dsh-home' }),
      /invalid profile name/,
    )
  }
})

test('resolveProfilePackageFile accepts a safe profile name', () => {
  assert.equal(
    resolveProfilePackageFile('web-preview.2', { DSH_HOME: '/tmp/dsh-home' }),
    '/tmp/dsh-home/profiles/web-preview.2/package.json',
  )
})

test('setupProfileBundle appends the installed bundle to profile bundles', async () => {
  const file = await writeProfile({
    dependencies: {
      'dsh-capability-discovery': 'github:444136347/dsh-capability-discovery#v0.1.1',
    },
    dsh: {
      profile: {
        bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'],
      },
    },
  })

  const result = await setupProfileBundle({ packageFile: file })
  const manifest = await readProfile(file)

  assert.equal(result.changed, true)
  assert.deepEqual(manifest.dsh.profile.bundles, [
    '@deepseek-ai/dsh-base',
    '@deepseek-ai/dsh-web-app',
    'dsh-capability-discovery',
  ])
})

test('setupProfileBundle leaves an existing bundle entry unchanged', async () => {
  const file = await writeProfile({
    dependencies: {
      'dsh-capability-discovery': 'github:444136347/dsh-capability-discovery#v0.1.1',
    },
    dsh: {
      profile: {
        bundles: ['@deepseek-ai/dsh-base', 'dsh-capability-discovery'],
      },
    },
  })

  const result = await setupProfileBundle({ packageFile: file })
  const manifest = await readProfile(file)

  assert.equal(result.changed, false)
  assert.deepEqual(manifest.dsh.profile.bundles, ['@deepseek-ai/dsh-base', 'dsh-capability-discovery'])
})

test('setupProfileBundle fails before editing when the package is not installed', async () => {
  const file = await writeProfile({
    dependencies: {
      other: '1.0.0',
    },
    dsh: {
      profile: {
        bundles: ['@deepseek-ai/dsh-base'],
      },
    },
  })

  await assert.rejects(setupProfileBundle({ packageFile: file }), (error) => {
    assert.match(error.message, /dsh-capability-discovery is not installed/)
    assert.match(error.message, new RegExp(`#v${packageManifest.version.replaceAll('.', '\\.')}`))
    return true
  })
  const manifest = await readProfile(file)
  assert.deepEqual(manifest.dsh.profile.bundles, ['@deepseek-ai/dsh-base'])
})
