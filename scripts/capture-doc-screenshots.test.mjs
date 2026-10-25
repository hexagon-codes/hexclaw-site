import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const directory = path.join(root, 'assets/docs/screenshots')
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'))

function walkReferencedContent(dir = root) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (['.git', 'node_modules'].includes(entry.name)) return []
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walkReferencedContent(full)
    return /\.(?:html|md|mdx)$/.test(full) ? [full] : []
  })
}

test('官网引用的截图具有安装版原生窗口来源及一致的文件校验记录', () => {
  assert.equal(manifest.schema_version, 2)
  const recorded = new Set(manifest.files.map(({ file }) => file))
  assert.equal(recorded.size, manifest.files.length)
  for (const entry of manifest.files) {
    assert.equal(entry.source, 'installed-native-window', entry.file)
    assert.equal(entry.redacted, true, entry.file)
    assert.match(entry.app_version, /^\d+\.\d+\.\d+(?:[-+].+)?$/, entry.file)
    const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(directory, entry.file))).digest('hex')
    assert.equal(entry.sha256, actual, entry.file)
  }
  for (const file of walkReferencedContent()) {
    for (const match of fs.readFileSync(file, 'utf8').matchAll(/assets\/docs\/screenshots\/([^"'<>\s)]+\.webp)/g)) {
      assert.ok(recorded.has(match[1]), `${file}: unrecorded screenshot ${match[1]}`)
    }
  }
})
