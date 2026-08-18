#!/usr/bin/env node
import { discoverCapabilities, defaultSources } from '../src/discovery/index.js'
import { inspectGitHubRepository } from '../src/risk/inspect.js'
import { resolveProfilePackageFile, setupProfileBundle } from '../src/setup/profile.js'
import { packageVersion } from '../src/meta.js'

const capabilityTypes = new Set(['plugin', 'skill', 'mcp', 'profile', 'agent', 'orchestrator', 'ui', 'runtime', 'workflow'])

function optionalFlagValue(args, flag) {
  const index = args.indexOf(flag)
  if (index < 0) return null
  const value = args[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`)
  return value
}

function stripFlags(args) {
  const flagsWithValues = new Set(['--limit', '--type'])
  const out = []
  for (let i = 0; i < args.length; i += 1) {
    if (flagsWithValues.has(args[i])) { i += 1; continue }
    if (args[i].startsWith('--')) continue
    out.push(args[i])
  }
  return out
}

function help() {
  console.log(`dsh-capability-discovery v${packageVersion}\n\nCommands:\n  dsh-capability search <keywords...> [--limit 10] [--type plugin|skill|mcp|profile|agent|orchestrator|ui|runtime|workflow] [--json]\n  dsh-capability inspect <owner/repo> [--json]\n  dsh-capability sources [--json]\n  dsh-capability setup [--profile web] [--json]\n`)
}

function printSearch(result) {
  console.log(`Query: ${result.query || '(none)'}${result.type ? ` · type=${result.type}` : ''}`)
  if (result.sourceErrors.length) console.log(`Source warnings: ${result.sourceErrors.map((item) => item.source).join(', ')}`)
  console.log('')
  for (const [index, item] of result.results.entries()) {
    console.log(`${index + 1}. ${item.fullName}  score=${item.score}  stars=${item.stars ?? 0}`)
    console.log(`   ${item.type ?? 'plugin'} · sources=${item.sources.join(', ')}`)
    if (item.description) console.log(`   ${item.description.slice(0, 180)}`)
    console.log(`   ${item.url}`)
  }
}

function printInspection(report) {
  console.log(`${report.repository.fullName} · heuristic risk: ${report.riskLevel}`)
  console.log(`Files scanned: ${report.filesScanned} · stars: ${report.repository.stars} · license: ${report.repository.license ?? 'unknown'}`)
  if (!report.findings.length) console.log('No known heuristic patterns were detected in the scanned files.')
  for (const finding of report.findings) console.log(`- [${finding.severity}] ${finding.kind} · ${finding.path}: ${finding.detail}`)
  console.log(`\n${report.limitations}`)
}

const args = process.argv.slice(2)
const command = args.shift()
const json = args.includes('--json')

try {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    help()
  } else if (command === 'setup') {
    const profile = optionalFlagValue(args, '--profile') ?? 'web'
    const packageFile = resolveProfilePackageFile(profile)
    const result = await setupProfileBundle({ packageFile, profile })
    if (json) console.log(JSON.stringify({ profile, packageFile, ...result }, null, 2))
    else {
      console.log(`${result.changed ? 'Added' : 'Already configured'} dsh-capability-discovery in profile "${profile}"`)
      console.log(`bundles: ${result.bundles.join(', ')}`)
      console.log(`Next: npx -y @deepseek-ai/dsh --profile ${profile} --dump-config | grep -n -C 4 -E 'dsh-capability-discovery|capability-discovery'`)
    }
  } else if (command === 'sources') {
    const payload = defaultSources.map((source) => ({ name: source.name, url: source.sourceUrl ?? 'GitHub Search API' }))
    if (json) console.log(JSON.stringify(payload, null, 2))
    else payload.forEach((source) => console.log(`- ${source.name}: ${source.url}`))
  } else if (command === 'search') {
    const limitValue = optionalFlagValue(args, '--limit')
    if (limitValue !== null && (!/^\d+$/.test(limitValue) || Number(limitValue) < 1 || Number(limitValue) > 50)) {
      throw new Error(`invalid --limit: ${limitValue}; expected an integer from 1 to 50`)
    }
    const type = optionalFlagValue(args, '--type')
    if (type !== null && !capabilityTypes.has(type)) {
      throw new Error(`invalid --type: ${type}; expected one of ${[...capabilityTypes].join(', ')}`)
    }
    const query = stripFlags(args).join(' ')
    if (!query) throw new Error('search requires at least one keyword')
    const limit = limitValue === null ? 10 : Number(limitValue)
    const result = await discoverCapabilities({ query, limit, type })
    if (json) console.log(JSON.stringify(result, null, 2))
    else printSearch(result)
  } else if (command === 'inspect') {
    const fullName = stripFlags(args)[0]
    if (!fullName) throw new Error('inspect requires owner/repo')
    const report = await inspectGitHubRepository(fullName)
    if (json) console.log(JSON.stringify(report, null, 2))
    else printInspection(report)
  } else {
    throw new Error(`unknown command: ${command}`)
  }
} catch (error) {
  console.error(`error: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
