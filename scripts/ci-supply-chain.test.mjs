import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('GitHub Actions 第三方依赖全部固定到完整 commit SHA', () => {
  const workflowDir = path.join(root, '.github', 'workflows')
  const failures = []

  for (const filename of fs.readdirSync(workflowDir).sort()) {
    const source = fs.readFileSync(path.join(workflowDir, filename), 'utf8')
    for (const [index, line] of source.split('\n').entries()) {
      if (!line.trimStart().startsWith('#') && /\b(?:ubuntu|macos|windows)-latest\b/.test(line)) {
        failures.push(`${filename}:${index + 1}: mutable runner ${line.trim()}`)
      }
      const uses = line.match(/^\s*-?\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/)?.[1]
      if (!uses || uses.startsWith('./')) continue
      if (!/@[0-9a-f]{40}$/.test(uses)) {
        failures.push(`${filename}:${index + 1}: ${uses}`)
      }
    }
  }

  assert.deepEqual(failures, [])
})
