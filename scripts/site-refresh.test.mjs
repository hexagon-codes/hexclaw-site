import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const screenshotDir = path.join(root, 'assets/docs/screenshots')

const screenshots = [
  'welcome-provider.webp',
  'welcome-agent.webp',
  'welcome-ready.webp',
  'chat-conversation.webp',
  'hero-workspace.webp',
  'agents-overview.webp',
  'agents-templates.webp',
  'knowledge-documents.webp',
  'knowledge-memory.webp',
  'automation-tasks.webp',
  'automation-webhooks.webp',
  'automation-workflow.webp',
  'connections-channels.webp',
  'connections-data-connectors.webp',
  'capabilities-skills.webp',
  'capabilities-mcp.webp',
  'capabilities-prompts.webp',
  'logs-observability.webp',
  'settings-model-providers.webp',
]

const requiredChineseDocShots = new Map([
  ['zh/docs/chat.html', ['chat-conversation.webp']],
  ['zh/docs/agents.html', ['agents-overview.webp', 'agents-templates.webp']],
  ['zh/docs/canvas.html', ['automation-workflow.webp']],
  ['zh/docs/providers.html', ['settings-model-providers.webp']],
  ['zh/docs/advanced.html', [
    'knowledge-documents.webp',
    'knowledge-memory.webp',
    'automation-tasks.webp',
    'automation-webhooks.webp',
    'connections-channels.webp',
    'connections-data-connectors.webp',
    'capabilities-skills.webp',
    'capabilities-mcp.webp',
    'capabilities-prompts.webp',
    'logs-observability.webp',
  ]],
])

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

function walkHtml(dir = root) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (['.git', 'node_modules'].includes(entry.name)) return []
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walkHtml(full)
    return full.endsWith('.html') ? [full] : []
  })
}

function uint24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16)
}

function webpDimensions(buffer) {
  assert.equal(buffer.subarray(0, 4).toString('ascii'), 'RIFF')
  assert.equal(buffer.subarray(8, 12).toString('ascii'), 'WEBP')

  let offset = 12
  while (offset + 8 <= buffer.length) {
    const type = buffer.subarray(offset, offset + 4).toString('ascii')
    const size = buffer.readUInt32LE(offset + 4)
    const payload = offset + 8

    if (type === 'VP8X') {
      return {
        width: uint24LE(buffer, payload + 4) + 1,
        height: uint24LE(buffer, payload + 7) + 1,
      }
    }
    if (type === 'VP8 ') {
      return {
        width: buffer.readUInt16LE(payload + 6) & 0x3fff,
        height: buffer.readUInt16LE(payload + 8) & 0x3fff,
      }
    }
    if (type === 'VP8L') {
      const packed = buffer.readUInt32LE(payload + 1)
      return {
        width: (packed & 0x3fff) + 1,
        height: ((packed >>> 14) & 0x3fff) + 1,
      }
    }

    offset = payload + size + (size % 2)
  }
  throw new Error('WebP dimensions were not found')
}

test('新一版文档截图完整替换旧 PNG，并统一为真实桌面窗口比例 WebP', () => {
  const files = fs.readdirSync(screenshotDir).sort()
  assert.deepEqual(files, [...screenshots, 'manifest.json'].sort())

  for (const filename of screenshots) {
    const file = path.join(screenshotDir, filename)
    const buffer = fs.readFileSync(file)
    assert.ok(buffer.length > 20_000, `${filename} is unexpectedly small`)
    assert.deepEqual(webpDimensions(buffer), { width: 2560, height: 1640 }, filename)
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(screenshotDir, 'manifest.json'), 'utf8'))
  assert.equal(manifest.schema_version, 1)
  assert.equal(manifest.viewport, '1280x820@2x')
  assert.deepEqual(manifest.files.map((entry) => entry.file).sort(), [...screenshots].sort())
  for (const entry of manifest.files) {
    assert.match(entry.source, /^(local-implementation|prototype-implemented)$/)
    assert.ok(entry.surface)
  }
})

test('快速上手与当前向导一致，其他核心文档和首页保留功能截图', () => {
  const gettingStarted = read('zh/docs/getting-started.html')
  assert.match(gettingStarted, /当前主线的首次配置向导包含 2 步/)
  assert.match(gettingStarted, /<strong>选择服务<\/strong>/)
  assert.match(gettingStarted, /<strong>检查并开始<\/strong>/)
  assert.doesNotMatch(gettingStarted, /assets\/docs\/screenshots\/welcome-(?:provider|agent|ready)\.webp/)
  const englishGettingStarted = read('en/docs/getting-started.html')
  assert.match(englishGettingStarted, /current main branch uses a 2-step setup wizard/)
  assert.match(englishGettingStarted, /<strong>Select a service<\/strong>/)
  assert.match(englishGettingStarted, /<strong>Check and start<\/strong>/)
  assert.doesNotMatch(englishGettingStarted, /assets\/docs\/screenshots\/welcome-(?:provider|agent|ready)\.webp/)
  for (const [file, expected] of requiredChineseDocShots) {
    const html = read(file)
    for (const filename of expected) {
      assert.match(html, new RegExp(`assets/docs/screenshots/${filename.replace('.', '\\.')}`), `${file}: ${filename}`)
    }
  }

  assert.match(read('zh/index.html'), /assets\/docs\/k12\/annotated-homework\.png/)
  for (const file of ['en/index.html', 'ug/index.html']) {
    assert.match(read(file), /assets\/docs\/screenshots\/hero-workspace\.webp/)
  }
})

test('所有文档截图都声明真实尺寸、延迟解码并保持等比缩放', () => {
  const failures = []
  for (const file of walkHtml()) {
    const relative = path.relative(root, file)
    const html = fs.readFileSync(file, 'utf8')
    for (const match of html.matchAll(/<img\b[^>]*assets\/docs\/screenshots\/[^>]*>/gi)) {
      const tag = match[0]
      if (!/\bwidth="2560"/.test(tag) || !/\bheight="1640"/.test(tag)) failures.push(`${relative}: wrong dimensions`)
      if (!/\bloading="lazy"/.test(tag)) failures.push(`${relative}: missing lazy loading`)
      if (!/\bdecoding="async"/.test(tag)) failures.push(`${relative}: missing async decoding`)
      const source = tag.match(/\bsrc="([^"]+)"/i)?.[1]
      if (!source || !fs.existsSync(path.resolve(path.dirname(file), source))) failures.push(`${relative}: missing image ${source ?? ''}`)
    }
  }
  assert.deepEqual(failures, [])

  for (const file of ['assets/css/docs.css', 'assets/css/home.css']) {
    const css = read(file)
    assert.match(css, /(?:\.doc-shot|\.hero-shot) img\s*\{[^}]*height:\s*auto;/s, file)
    assert.match(css, /(?:\.doc-shot|\.hero-shot) img\s*\{[^}]*aspect-ratio:\s*64\s*\/\s*41;/s, file)
    assert.match(css, /(?:\.doc-shot|\.hero-shot) img\s*\{[^}]*object-fit:\s*contain;/s, file)
  }

  const referencedDocsStyles = new Set()
  for (const file of walkHtml()) {
    const html = fs.readFileSync(file, 'utf8')
    const href = html.match(/<link\b[^>]*href="([^"]*docs(?:-[0-9a-f]{12})?\.css)"/i)?.[1]
    if (href) referencedDocsStyles.add(path.resolve(path.dirname(file), href))
  }
  for (const stylesheet of referencedDocsStyles) {
    assert.ok(fs.existsSync(stylesheet), `missing referenced stylesheet: ${stylesheet}`)
    const css = fs.readFileSync(stylesheet, 'utf8')
    assert.match(css, /\.doc-shot img\s*\{[^}]*height:\s*auto;/s, stylesheet)
    assert.match(css, /\.doc-shot img\s*\{[^}]*aspect-ratio:\s*64\s*\/\s*41;/s, stylesheet)
  }
})

test('完整页脚底栏只保留版权信息', () => {
  const failures = []
  for (const file of walkHtml()) {
    const html = fs.readFileSync(file, 'utf8')
    const footer = html.match(/<footer\b[\s\S]*?<\/footer>/i)?.[0]
    if (!footer) continue

    const bottom = footer.match(/<div class="footer-bottom">[\s\S]*?<\/div>\s*<\/footer>/i)?.[0]
    if (!bottom) continue
    if (/<a\b/i.test(bottom)) failures.push(`${path.relative(root, file)}: footer bottom still contains links`)
    const hrefs = [...footer.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)].map((match) => match[1])
    if (hrefs.filter((href) => /\/privacy\/?$/.test(href)).length !== 1) failures.push(`${path.relative(root, file)}: privacy link is not unique`)
    if (hrefs.filter((href) => /\/terms\/?$/.test(href)).length !== 1) failures.push(`${path.relative(root, file)}: terms link is not unique`)
    if (hrefs.filter((href) => href === 'mailto:support@hexclaw.net').length !== 1) failures.push(`${path.relative(root, file)}: feedback link is not unique`)
  }
  assert.deepEqual(failures, [])
})

test('文档移动导航避开固定顶栏，中等视口页脚不会挤压正文', () => {
  const css = read('assets/css/docs.css')
  assert.match(css, /@media\s*\(max-width:\s*768px\)[\s\S]*?\.mobile-doc-nav\s*\{[^}]*margin-top:\s*64px;/)
  assert.match(css, /@media\s*\(max-width:\s*768px\)[\s\S]*?\.doc-gallery\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/)
  assert.match(css, /@media\s*\(min-width:\s*769px\)\s*and\s*\(max-width:\s*1100px\)/)
  assert.match(css, /\.sb\s*~\s*\.footer\s+\.footer-columns\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s)
})

test('主题与语言控件使用明确按钮类型和本地化辅助名称', () => {
  const failures = []
  for (const file of walkHtml()) {
    const relative = path.relative(root, file)
    const html = fs.readFileSync(file, 'utf8')
    for (const match of html.matchAll(/<button\b[^>]*class="[^"]*(?:theme-toggle|nav-theme-toggle)[^"]*"[^>]*>/gi)) {
      if (!/\btype="button"/.test(match[0])) failures.push(`${relative}: theme button is missing type=button`)
    }
    const expectedLanguageLabel = relative.startsWith('zh/') ? '切换语言' : relative.startsWith('ug/') ? 'تىل ئالماشتۇرۇش' : null
    if (expectedLanguageLabel && /class="lang-trigger"/.test(html) && !new RegExp(`class="lang-trigger"[^>]*aria-label="${expectedLanguageLabel}"`).test(html)) {
      failures.push(`${relative}: language switcher label is not localized`)
    }
  }
  assert.deepEqual(failures, [])
})

test('站点地图按页面已有语言声明 hreflang，并保留有效更新时间', () => {
  const sitemap = read('sitemap.xml')
  const failures = []
  for (const match of sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const block = match[1]
    const location = block.match(/<loc>([^<]+)<\/loc>/)?.[1]
    if (!location || !/\/(?:zh|en|ug)\//.test(location)) continue
    const languages = location === 'https://hexclaw.net/zh/docs/k12'
      ? ['zh-CN', 'x-default']
      : ['en', 'zh-CN', 'ug', 'x-default']
    for (const language of languages) {
      if (!new RegExp(`hreflang="${language}"`).test(block)) failures.push(`${location}: missing ${language}`)
    }
    const lastmod = block.match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/)?.[1]
    const date = lastmod ? new Date(`${lastmod}T00:00:00Z`) : null
    if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== lastmod) {
      failures.push(`${location}: invalid lastmod`)
    }
  }
  assert.deepEqual(failures, [])
})

test('站内内容链接直接指向 canonical 路径，不额外触发尾斜杠重定向', () => {
  const failures = []
  const redirectingPath = /^\/(?:zh|en|ug)\/(?:about|changelog|privacy|terms|third-party-ai-services|docs\/(?:getting-started|chat|agents|canvas|providers|advanced|shortcuts|faq))\/$/
  for (const file of walkHtml()) {
    const html = fs.readFileSync(file, 'utf8')
    for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)) {
      if (redirectingPath.test(match[1])) failures.push(`${path.relative(root, file)}: ${match[1]}`)
    }
  }
  assert.deepEqual(failures, [])
})
