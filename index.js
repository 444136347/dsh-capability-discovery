import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-capability-discovery'
export const inject = ['skills']

function parseSkill(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) throw new Error('capability-discovery: SKILL.md frontmatter is missing')
  const frontmatter = match[1]
  const skillName = frontmatter.match(/^name:\s*([^\n]+)$/m)?.[1]?.trim()
  const descriptionMatch = frontmatter.match(/^description:\s*>\s*\n((?:^[ \t]+.*\n?)+)/m)
  const description = descriptionMatch?.[1]?.replace(/^\s+/gm, '').replace(/\s+/g, ' ').trim()
  if (!skillName || !description) throw new Error('capability-discovery: invalid skill name or description')
  return { skillName, description, content: match[2].trim() }
}

export function apply(ctx) {
  const root = join(dirname(fileURLToPath(import.meta.url)), 'skills', 'capability-discovery')
  const path = join(root, 'SKILL.md')
  const { skillName, description, content } = parseSkill(readFileSync(path, 'utf8'))
  return ctx.skills.register({
    name: skillName,
    description,
    invocation: {
      modelInvocable: true,
      userInvocable: true,
    },
    source: 'runtime',
    content,
    path,
    resourceBase: { kind: 'directory', path: root },
  })
}
