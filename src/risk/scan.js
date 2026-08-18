const CODE_EXT = /\.(?:js|mjs|cjs|ts|tsx|jsx|sh|bash|py|rb|go|rs)$/i
const INSTRUCTION_FILE = /(?:^|\/)(?:SKILL|AGENTS|CLAUDE|GEMINI)\.md$/i

function add(findings, kind, severity, path, detail) {
  findings.push({ kind, severity, path, detail })
}

export function scanRepositoryFiles(files) {
  const findings = []
  let dependencyCount = 0

  for (const file of files) {
    const path = file.path ?? ''
    const content = String(file.content ?? '')

    if (path === 'package.json' || path.endsWith('/package.json')) {
      try {
        const pkg = JSON.parse(content)
        dependencyCount += Object.keys(pkg.dependencies ?? {}).length
        for (const key of ['preinstall', 'install', 'postinstall', 'prepare']) {
          if (pkg.scripts?.[key]) add(findings, 'lifecycle-script', 'medium', path, `${key}: ${pkg.scripts[key]}`)
        }
      } catch {
        add(findings, 'unparseable-package', 'low', path, 'package.json could not be parsed')
      }
    }

    if (CODE_EXT.test(path)) {
      if (/\b(?:child_process|execSync|execFile|spawnSync|spawn)\b/.test(content)) add(findings, 'subprocess', 'medium', path, 'process execution APIs detected')
      if (/\bprocess\.env\b|\.env\b|credentials?|private[_-]?key|ssh[_-]?key/i.test(content)) add(findings, 'credential-access', 'medium', path, 'environment or credential-related access detected')
      if (/\bfetch\s*\(|\baxios\b|\bhttps?\.request\b|\bWebSocket\b|https?:\/\//i.test(content)) add(findings, 'network-access', 'medium', path, 'network access patterns detected')
      if (/\b(?:writeFile|writeFileSync|appendFile|appendFileSync|unlink|unlinkSync|rmSync|renameSync|chmodSync)\b/.test(content)) add(findings, 'filesystem-write', 'medium', path, 'filesystem mutation APIs detected')
    }

    if (INSTRUCTION_FILE.test(path)) {
      if (/ignore (?:all |any )?(?:previous|prior) instructions|do not tell the user|hide (?:this|these) from the user|send .{0,80}(?:credential|secret|session|file).{0,80}https?:\/\//is.test(content)) {
        add(findings, 'instruction-risk', 'high', path, 'instruction text contains prompt-injection or exfiltration-like patterns')
      }
    }
  }

  if (dependencyCount > 30) add(findings, 'dependency-surface', 'low', 'package.json', `${dependencyCount} runtime dependencies increase supply-chain surface`)

  const high = findings.some((finding) => finding.severity === 'high')
  const mediumCount = findings.filter((finding) => finding.severity === 'medium').length
  const riskLevel = high ? 'high' : mediumCount >= 3 ? 'medium' : mediumCount > 0 ? 'low-to-medium' : 'low'

  return {
    riskLevel,
    findings,
    dependencyCount,
    limitations: 'Heuristic static inspection only. A low-risk result does not prove the repository is safe.',
  }
}
