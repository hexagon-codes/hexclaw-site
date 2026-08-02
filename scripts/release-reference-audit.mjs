#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const RELEASE_REPOSITORY = 'hexagon-codes/hexclaw-desktop'
const SEMVER = String.raw`\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?`

function finding(code, file, url) {
  return Object.freeze({ code, file, url })
}

function auditReleaseURL(parsed, rawURL, file) {
  const parts = parsed.pathname.split('/').filter(Boolean)
  const releaseIndex = parts.indexOf('releases')
  if (releaseIndex < 0 || parts[releaseIndex + 1] !== 'download') return []

  const issues = []
  if (parsed.protocol !== 'https:') {
    issues.push(finding('insecure-release-url', file, rawURL))
  }
  if (`${parts[0] ?? ''}/${parts[1] ?? ''}` !== RELEASE_REPOSITORY) {
    issues.push(finding('untrusted-release-repository', file, rawURL))
    return issues
  }
  if (releaseIndex !== 2 || parts.length !== 6 || parsed.search !== '' || parsed.hash !== '') {
    issues.push(finding('unexpected-release-path', file, rawURL))
    return issues
  }

  const tag = parts[4]
  const artifact = parts[5]
  const tagMatch = tag.match(new RegExp(`^v(${SEMVER})$`))
  if (!tagMatch) {
    issues.push(finding('unversioned-release-artifact', file, rawURL))
  } else if (
    !artifact.startsWith(`HexClaw_${tagMatch[1]}_`)
    && !artifact.startsWith(`HexClaw-${tagMatch[1]}-`)
  ) {
    issues.push(finding('artifact-version-mismatch', file, rawURL))
  }
  return issues
}

function auditInstallerURL(parsed, rawURL, file) {
  if (parsed.hostname !== 'raw.githubusercontent.com') return []
  const parts = parsed.pathname.split('/').filter(Boolean)
  if (`${parts[0] ?? ''}/${parts[1] ?? ''}` !== RELEASE_REPOSITORY) return []

  const issues = []
  if (parsed.protocol !== 'https:') {
    issues.push(finding('insecure-installer-url', file, rawURL))
  }
  if (parts.length !== 4 || parts[3] !== 'install.sh' || parsed.search !== '' || parsed.hash !== '') {
    issues.push(finding('unexpected-installer-path', file, rawURL))
    return issues
  }
  if (!/^[0-9a-f]{40}$/.test(parts[2])) {
    issues.push(finding('moving-installer-ref', file, rawURL))
  }
  return issues
}

export function auditReleaseReferences(source, file = '<input>') {
  const findings = []
  for (const match of source.matchAll(/https?:\/\/[^\s"'<>]+/g)) {
    const rawURL = match[0]
    let parsed
    try {
      parsed = new URL(rawURL)
    } catch {
      findings.push(finding('invalid-release-url', file, rawURL))
      continue
    }
    findings.push(...auditReleaseURL(parsed, rawURL, file))
    findings.push(...auditInstallerURL(parsed, rawURL, file))
  }
  return findings
}

function htmlFiles(input) {
  const metadata = fs.statSync(input)
  if (metadata.isFile()) return input.endsWith('.html') ? [input] : []
  return fs.readdirSync(input, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '.git' || entry.name === 'node_modules') return []
    return htmlFiles(path.join(input, entry.name))
  })
}

export function auditReleaseReferencePaths(inputs) {
  return inputs.flatMap((input) => htmlFiles(path.resolve(input))).flatMap((file) =>
    auditReleaseReferences(fs.readFileSync(file, 'utf8'), file),
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const inputs = process.argv.slice(2)
  const findings = auditReleaseReferencePaths(inputs.length > 0 ? inputs : ['.'])
  for (const issue of findings) {
    console.error(`${issue.file}: ${issue.code}: ${issue.url}`)
  }
  if (findings.length > 0) process.exitCode = 1
}
