import test from 'node:test'
import assert from 'node:assert/strict'
import { statSync } from 'node:fs'
import { resolve } from 'node:path'

import { apply, inject, name } from '../index.js'

function loadBundle() {
  const registered = []
  const dispose = () => {}
  const result = apply({ skills: { register: (skill) => { registered.push(skill); return dispose } } })
  return { registered, dispose, result }
}

test('DSH bundle returns the capability-discovery registration disposer', () => {
  const { registered, dispose, result } = loadBundle()
  assert.equal(name, 'dsh-capability-discovery')
  assert.deepEqual(inject, ['skills'])
  assert.equal(result, dispose)
  assert.equal(registered.length, 1)
  assert.equal(registered[0].name, 'capability-discovery')
  assert.equal(registered[0].source, 'runtime')
  assert.ok(registered[0].description.includes('DeepSeek Harness'))
  assert.ok(registered[0].content.includes('dsh-capability'))
})

test('capability-discovery resolves its CLI path from the Skill resource base', () => {
  const { registered } = loadBundle()
  const commandPath = registered[0].content.match(/node\s+(\S+)\s+search/)?.[1]
  assert.ok(commandPath, 'Skill must declare its search CLI path')
  assert.equal(statSync(resolve(registered[0].resourceBase.path, commandPath)).isFile(), true)
})

test('capability-discovery is explicitly available to users and the model', () => {
  const { registered } = loadBundle()

  assert.deepEqual(registered[0].invocation, {
    modelInvocable: true,
    userInvocable: true,
  })
})

test('capability-discovery description states when the Skill should be used', () => {
  const { registered } = loadBundle()

  assert.match(registered[0].description, /^Use when /)
})
