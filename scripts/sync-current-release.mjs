#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SEMVER } from './release-reference-audit.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'meta/current-release.json'), 'utf8'))
if (!new RegExp(`^${SEMVER}$`).test(version)) throw new Error('Invalid current release version')
const write = process.argv.includes('--write')
if (process.argv.slice(2).some((arg) => arg !== '--check' && arg !== '--write')) throw new Error('Use --check or --write')
const semver = SEMVER
let drift = false
// 只同步表达当前安装版本的页面，历史日志及固定安装脚本不参与生成。
for (const language of ['zh', 'en', 'ug']) {
  for (const page of ['index.html', 'docs/getting-started.html']) {
    const relative = `${language}/${page}`
    const file = path.join(root, relative)
    const source = fs.readFileSync(file, 'utf8')
    const synced = source
      .replace(new RegExp(`(releases/download/v)(${semver})/([^\\s"'<>]+)`, 'g'), (_, prefix, oldVersion, artifact) => {
        for (const separator of ['_', '-']) {
          const oldPrefix = `HexClaw${separator}${oldVersion}${separator}`
          if (artifact.startsWith(oldPrefix)) {
            return `${prefix}${version}/HexClaw${separator}${version}${separator}${artifact.slice(oldPrefix.length)}`
          }
        }
        throw new Error(`Unexpected release artifact in ${relative}`)
      })
      .replace(new RegExp(`releases/(download|tag)/v${semver}`, 'g'), `releases/$1/v${version}`)
      .replace(new RegExp(`\\bv${semver}\\b`, 'g'), `v${version}`)
      .replace(/("softwareVersion"\s*:\s*")[^"]+("|$)/g, `$1${version}$2`)
    if (synced === source) continue
    drift = true
    if (write) fs.writeFileSync(file, synced)
    else console.error(`${relative}: current release reference is out of sync`)
  }
}
if (drift && !write) process.exitCode = 1
