import assert from 'node:assert/strict'
import test from 'node:test'

import { auditReleaseReferences } from './release-reference-audit.mjs'

test('发布引用只接受版本一致的不可变制品 URL 和 commit 固定的安装脚本', () => {
  const source = `
    https://github.com/hexagon-codes/hexclaw-desktop/releases/download/v0.4.9/HexClaw_0.4.9_aarch64.dmg
    https://raw.githubusercontent.com/hexagon-codes/hexclaw-desktop/1a89a053eca7c6d1353adfdc2f0bbc7c0b5aa756/install.sh
  `

  assert.deepEqual(auditReleaseReferences(source, 'safe.html'), [])
})

test('发布引用拒绝漂移版本、浮动安装脚本和非 HTTPS 下载', () => {
  const source = `
    https://github.com/hexagon-codes/hexclaw-desktop/releases/download/v0.4.9/HexClaw_0.4.8_x64.dmg
    https://raw.githubusercontent.com/hexagon-codes/hexclaw-desktop/main/install.sh
    http://github.com/hexagon-codes/hexclaw-desktop/releases/download/v0.4.9/HexClaw_0.4.9_aarch64.dmg
  `

  assert.deepEqual(
    auditReleaseReferences(source, 'unsafe.html').map((finding) => finding.code),
    ['artifact-version-mismatch', 'moving-installer-ref', 'insecure-release-url'],
  )
})

test('发布引用拒绝不受支持的仓库、路径和安装脚本 ref', () => {
  const source = `
    https://github.com/example/hexclaw-desktop/releases/download/v0.4.9/HexClaw_0.4.9_aarch64.dmg
    https://raw.githubusercontent.com/hexagon-codes/hexclaw-desktop/v0.4.9/install.sh
    https://raw.githubusercontent.com/hexagon-codes/hexclaw-desktop/0123456789abcdef0123456789abcdef01234567/other.sh
  `

  assert.deepEqual(
    auditReleaseReferences(source, 'boundary.html').map((finding) => finding.code),
    ['untrusted-release-repository', 'moving-installer-ref', 'unexpected-installer-path'],
  )
})
