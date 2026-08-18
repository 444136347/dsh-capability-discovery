import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const cli = fileURLToPath(new URL('../cli/dsh-capability.mjs', import.meta.url))
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

function runCli(args) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' })
}

test('CLI rejects an unsupported capability type before searching', () => {
  const result = runCli(['search', '--type', 'banana'])

  assert.equal(result.status, 1)
  assert.match(result.stderr, /invalid --type/)
})

test('CLI rejects a missing capability type value', () => {
  const result = runCli(['search', '--type'])

  assert.equal(result.status, 1)
  assert.match(result.stderr, /--type requires a value/)
})

test('CLI rejects limits outside the supported integer range', () => {
  for (const value of ['0', '51', '1.5', 'many']) {
    const result = runCli(['search', '--limit', value])
    assert.equal(result.status, 1)
    assert.match(result.stderr, /invalid --limit/)
  }
})

test('CLI rejects a missing limit value', () => {
  const result = runCli(['search', '--limit'])

  assert.equal(result.status, 1)
  assert.match(result.stderr, /--limit requires a value/)
})

test('CLI rejects unsafe setup profile names before reading a manifest', () => {
  const result = runCli(['setup', '--profile', '../../outside'])

  assert.equal(result.status, 1)
  assert.match(result.stderr, /invalid profile name/)
})

test('CLI help displays the package manifest version', () => {
  const result = runCli(['--help'])

  assert.equal(result.status, 0)
  assert.match(result.stdout, new RegExp(`v${manifest.version.replaceAll('.', '\\.')}`))
})
