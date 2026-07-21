import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const script = fs.readFileSync(path.join(root, 'scripts/capture-doc-screenshots.mjs'), 'utf8')
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/docs/screenshots/manifest.json'), 'utf8'))

const expectedStems = manifest.files
  .map(({ file }) => file.replace(/\.webp$/, ''))
  .sort()

function walkReferencedContent(dir = root) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (['.git', 'node_modules'].includes(entry.name)) return []
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walkReferencedContent(full)
    return /\.(?:html|md|mdx)$/.test(full) ? [full] : []
  })
}

test('截图管线与官网引用共享同一组 19 个稳定文件名', () => {
  const capturedStems = [...script.matchAll(/capture\(page,\s*outputDir,\s*'([^']+)'\)/g)]
    .map((match) => match[1])
    .sort()
  assert.equal(new Set(capturedStems).size, 19)
  assert.deepEqual(capturedStems, expectedStems)

  const referenced = new Set()
  for (const file of walkReferencedContent()) {
    const content = fs.readFileSync(file, 'utf8')
    for (const match of content.matchAll(/assets\/docs\/screenshots\/([^"'<>\s)]+)\.webp/g)) {
      referenced.add(match[1])
    }
  }
  assert.deepEqual([...referenced].sort(), expectedStems)
})

test('截图使用 1280×820@2x 设备像素，并在落盘时校验 2560×1640', () => {
  assert.match(script, /const CAPTURE_VIEWPORT = Object\.freeze\(\{ width: 1280, height: 820 \}\)/)
  assert.match(script, /const DEVICE_SCALE_FACTOR = 2/)
  assert.match(script, /viewport:\s*CAPTURE_VIEWPORT/)
  assert.match(script, /deviceScaleFactor:\s*DEVICE_SCALE_FACTOR/)
  assert.match(script, /scale:\s*'device'/)
  assert.match(script, /assertCaptureDimensions\(buffer,\s*name\)/)
})

test('会话与首页工作台按已批准的四态契约显式准备', () => {
  assert.match(
    script,
    /const WORKSPACE_MODES = Object\.freeze\(\['sessions', 'artifacts', 'context', 'focus'\]\)/,
  )
  assert.match(
    script,
    /await selectWorkspaceMode\(page, 'sessions'\)\s*\n\s*await capture\(page, outputDir, 'chat-conversation'\)/,
  )
  assert.match(
    script,
    /await selectWorkspaceMode\(page, 'artifacts'\)[\s\S]*?await page\.locator\('#artifactsPanel'\)\.waitFor\(\{ state: 'visible' \}\)[\s\S]*?await capture\(page, outputDir, 'hero-workspace'\)/,
  )
  assert.match(script, /data-workspace-mode/)
})

test('捕获时只验证产品版本，不再把新版本覆写成旧引擎文案', () => {
  assert.match(script, /const PRODUCT_VERSION_LABEL = 'HexClaw 0\.5\.0-beta'/)
  assert.match(script, /assertPrototypeVersion/)
  assert.doesNotMatch(script, /engineLabel\.textContent\s*=/)
  assert.doesNotMatch(script, /Hexagon engine · 运行中/)
})

test('浏览器截图统一补齐 macOS 原生窗口控制点且不会在原型中重复插入', () => {
  assert.match(script, /async function ensureMacWindowControls\(page\)/)
  assert.match(script, /document\.querySelector\('\.tb-system-controls, \.hc-capture-system-controls'\)/)
  assert.match(script, /className = 'hc-capture-system-controls'/)
  assert.match(script, /data-capture-system-chrome/)
  assert.match(script, /width:\s*12px/)
  assert.match(script, /height:\s*12px/)
  assert.match(script, /top:\s*8px/)
  assert.match(script, /left:\s*8px/)
  assert.match(script, /gap:\s*8px/)
  assert.match(script, /#ff5f57/)
  assert.match(script, /#febc2e/)
  assert.match(script, /#28c840/)
  assert.match(script, /await ensureMacWindowControls\(page\)\s*\n\s*await assertPrototypeVersion\(page\)/)
})
