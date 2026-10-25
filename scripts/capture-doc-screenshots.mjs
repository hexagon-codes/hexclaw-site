#!/usr/bin/env node

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const usage = `截取已安装的 HexClaw 原生窗口，保留系统窗口按钮。

用法：
  node scripts/capture-doc-screenshots.mjs --output <私有目录> --name <场景名>

先在客户端打开对应页面。输出原始 PNG 与来源记录，不会覆盖官网资源。
发布前须脱敏云端地址、个人信息与宿主路径，再转换为 WebP 并更新素材清单。
要求 macOS 14.2+，已安装 Xcode 命令行工具并授予屏幕录制权限。
`
const options = {}
for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index]
  if (argument === '--help') { process.stdout.write(usage); process.exit(0) }
  if (argument === '--output' || argument === '--name') options[argument.slice(2)] = process.argv[++index]
  else throw new Error(`Unknown argument: ${argument}`)
}
if (!options.output || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(options.name ?? '')) throw new Error(usage)
if (process.platform !== 'darwin') throw new Error('Native window capture requires macOS')

const output = path.resolve(options.output)
fs.mkdirSync(output, { recursive: true, mode: 0o700 })
const image = path.join(output, `${options.name}-raw.png`)
const receipt = path.join(output, `${options.name}-source.json`)
if (fs.existsSync(image) || fs.existsSync(receipt)) throw new Error('Capture already exists; use another private output directory')
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'hexclaw-native-capture-'))
try {
  const executable = path.join(temporary, 'capture-window')
  execFileSync('xcrun', ['swiftc', '-parse-as-library', path.join(scriptDir, 'capture-native-window.swift'), '-o', executable], { stdio: 'inherit' })
  execFileSync(executable, [image, receipt], { stdio: 'inherit' })
} finally {
  fs.rmSync(temporary, { recursive: true, force: true })
}
