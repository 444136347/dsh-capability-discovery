import { readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { packageVersion } from '../meta.js'

export const bundleName = 'dsh-capability-discovery'

export function validateProfileName(profile) {
  if (typeof profile !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(profile)) {
    throw new Error(`invalid profile name: ${JSON.stringify(profile)}`)
  }
  return profile
}

export function resolveProfilePackageFile(profile = 'web', env = process.env) {
  validateProfileName(profile)
  const home = env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'profiles', profile, 'package.json')
}

function hasDependency(manifest, name) {
  return Boolean(
    manifest.dependencies?.[name]
    || manifest.devDependencies?.[name]
    || manifest.optionalDependencies?.[name],
  )
}

export async function setupProfileBundle({ packageFile, profile = 'web', name = bundleName } = {}) {
  if (!packageFile) throw new Error('setup requires a profile package.json path')

  let raw
  try {
    raw = await readFile(packageFile, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`profile package.json not found: ${packageFile}`)
    }
    throw error
  }

  const manifest = JSON.parse(raw)
  if (!hasDependency(manifest, name)) {
    throw new Error(`${name} is not installed in this profile; run dsh plugin --profile ${profile} add github:444136347/dsh-capability-discovery#v${packageVersion} first`)
  }

  manifest.dsh ??= {}
  manifest.dsh.profile ??= {}
  manifest.dsh.profile.bundles ??= []

  if (!Array.isArray(manifest.dsh.profile.bundles)) {
    throw new Error('profile dsh.profile.bundles must be an array')
  }

  if (manifest.dsh.profile.bundles.includes(name)) {
    return { changed: false, bundles: manifest.dsh.profile.bundles }
  }

  manifest.dsh.profile.bundles.push(name)
  await writeFile(packageFile, `${JSON.stringify(manifest, null, 2)}\n`)
  return { changed: true, bundles: manifest.dsh.profile.bundles }
}
