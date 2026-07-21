#!/usr/bin/env node

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const siteRoot = path.resolve(scriptDir, '..')
const defaultPlaywright = path.resolve(siteRoot, '../hexclaw-desktop/node_modules/playwright/index.mjs')
const prototypeFile = path.resolve(siteRoot, '../hexclaw-docs/prototype/app.html')
const desktopPackageFile = path.resolve(siteRoot, '../hexclaw-desktop/package.json')

const CAPTURE_VIEWPORT = Object.freeze({ width: 1280, height: 820 })
const DEVICE_SCALE_FACTOR = 2
const EXPECTED_CAPTURE_PIXELS = Object.freeze({ width: 2560, height: 1640 })
const PRODUCT_VERSION_LABEL = 'HexClaw 0.5.0-beta'
const WORKSPACE_MODES = Object.freeze(['sessions', 'artifacts', 'context', 'focus'])
const EXPECTED_CAPTURE_STEMS = Object.freeze([
  'welcome-provider',
  'welcome-agent',
  'welcome-ready',
  'chat-conversation',
  'hero-workspace',
  'agents-overview',
  'agents-templates',
  'knowledge-documents',
  'knowledge-memory',
  'automation-tasks',
  'automation-webhooks',
  'automation-workflow',
  'connections-channels',
  'connections-data-connectors',
  'capabilities-skills',
  'capabilities-mcp',
  'capabilities-prompts',
  'logs-observability',
  'settings-model-providers',
])
const capturedStems = []

function usage() {
  return `用 Playwright 重拍 HexClaw 官网文档截图。

用法：
  node scripts/capture-doc-screenshots.mjs --output <目录> [--desktop-url <URL>]

参数：
  --output        必填。19 张 2560×1640 PNG 临时输出目录，不会自动覆盖官网资源。
  --desktop-url   当前本地 Desktop Vite 地址，默认 http://127.0.0.1:5173。
  --help          显示帮助。

环境变量：
  HEXCLAW_PLAYWRIGHT_MODULE  Playwright index.mjs 路径。
`
}

function parseArgs(argv) {
  const options = { desktopUrl: 'http://127.0.0.1:5173', output: '' }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--help') return { ...options, help: true }
    if (argument === '--output') options.output = argv[++index] ?? ''
    else if (argument === '--desktop-url') options.desktopUrl = argv[++index] ?? ''
    else throw new Error(`未知参数：${argument}`)
  }
  return options
}

function json(route, body) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

function assertDesktopVersionSource() {
  const { version } = JSON.parse(fs.readFileSync(desktopPackageFile, 'utf8'))
  assert.equal(`HexClaw ${version}`, PRODUCT_VERSION_LABEL, 'Desktop package version 与截图产品标签不一致')
}

async function assertPrototypeVersion(page) {
  const engineLabel = page.locator('#engineLabel')
  if (await engineLabel.count() === 0) return
  assert.equal((await engineLabel.textContent())?.trim(), PRODUCT_VERSION_LABEL)
}

async function ensureMacWindowControls(page) {
  await page.evaluate(() => {
    if (document.querySelector('.tb-system-controls, .hc-capture-system-controls')) return

    const controls = document.createElement('div')
    controls.className = 'hc-capture-system-controls'
    controls.setAttribute('aria-hidden', 'true')
    controls.setAttribute('data-capture-system-chrome', '')
    for (const name of ['close', 'minimize', 'zoom']) {
      const control = document.createElement('span')
      control.className = `hc-capture-system-control hc-capture-system-control--${name}`
      controls.append(control)
    }
    document.body.append(controls)
  })
  await page.addStyleTag({
    content: `
      [data-capture-system-chrome] {
        position: fixed;
        top: 8px;
        left: 8px;
        z-index: 10001;
        display: flex;
        align-items: center;
        gap: 8px;
        pointer-events: none;
      }
      .hc-capture-system-control {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        box-shadow: inset 0 0 0 .5px rgba(0, 0, 0, .12);
      }
      .hc-capture-system-control--close { background: #ff5f57; }
      .hc-capture-system-control--minimize { background: #febc2e; }
      .hc-capture-system-control--zoom { background: #28c840; }
    `,
  })
}

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    document.documentElement.setAttribute('data-theme', 'light')
    document.querySelectorAll('*').forEach((element) => {
      if (element instanceof HTMLElement) element.style.caretColor = 'transparent'
    })
  })
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        scroll-behavior: auto !important;
      }
      [data-prototype-only] { display: none !important; }
    `,
  })
  await ensureMacWindowControls(page)
  await assertPrototypeVersion(page)
}

function assertCaptureDimensions(buffer, name) {
  assert.equal(buffer.subarray(1, 4).toString('ascii'), 'PNG', `${name}: 不是 PNG`)
  assert.deepEqual(
    { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) },
    EXPECTED_CAPTURE_PIXELS,
    `${name}: 截图像素尺寸漂移`,
  )
}

async function capture(page, outputDir, name) {
  await settle(page)
  assert.ok(EXPECTED_CAPTURE_STEMS.includes(name), `${name}: 不在官网 19 张截图清单中`)
  assert.ok(!capturedStems.includes(name), `${name}: 重复捕获`)
  const buffer = await page.screenshot({
    path: path.join(outputDir, `${name}.png`),
    animations: 'disabled',
    fullPage: false,
    scale: 'device',
  })
  assertCaptureDimensions(buffer, name)
  capturedStems.push(name)
}

async function captureWelcome(chromium, outputDir, desktopUrl) {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: CAPTURE_VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    colorScheme: 'light',
    locale: 'zh-CN',
    reducedMotion: 'reduce',
  })
  const page = context.pages()[0] ?? await context.newPage()

  await page.addInitScript(() => {
    localStorage.setItem('hc-theme', 'light')
    localStorage.setItem('hc-locale', 'zh-CN')
  })
  await page.route('**/_hexclaw/**', async (route) => {
    const request = route.request()
    const pathname = new URL(request.url()).pathname.replace(/^\/_hexclaw/, '')
    if (pathname === '/api/v1/config/llm/test') {
      return json(route, { ok: true, message: '连接测试通过' })
    }
    if (pathname.includes('health') || pathname.includes('status')) {
      return json(route, { status: 'ok', running: true, version: '0.5.0-beta', models: [] })
    }
    if (pathname === '/api/v1/config') {
      return json(route, {
        server: { host: '127.0.0.1', port: 16060, mode: 'desktop' },
        llm: { default: 'openai', providers: {} },
        knowledge: {}, mcp: {}, cron: {}, webhook: {}, canvas: {}, voice: {}, sandbox: {}, security: {},
      })
    }
    if (pathname.endsWith('/roles')) return json(route, { roles: [] })
    if (pathname.endsWith('/agents')) return json(route, { agents: [], total: 0, default: '' })
    return json(route, {})
  })

  await page.goto(`${desktopUrl}/welcome`, { waitUntil: 'domcontentloaded' })
  await page.locator('.hc-welcome__logo').waitFor({ state: 'attached' })
  await page.locator('#splash-screen').evaluate((element) => element.remove()).catch(() => {})
  await page.locator('.hc-welcome__logo').waitFor({ state: 'visible' })

  await page.locator('input[type="password"]').fill('sk-demo-release-ready')
  await page.getByRole('button', { name: /测试连接/ }).click()
  await page.getByText('连接测试通过', { exact: true }).waitFor()
  await capture(page, outputDir, 'welcome-provider')

  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByText('小蟹对话', { exact: true }).waitFor()
  await capture(page, outputDir, 'welcome-agent')

  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByText('已验证', { exact: true }).waitFor()
  await capture(page, outputDir, 'welcome-ready')
  await context.close()
  await browser.close()
}

async function capturePrototype(chromium, outputDir) {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: CAPTURE_VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    colorScheme: 'light',
    locale: 'zh-CN',
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  await page.goto(pathToFileURL(prototypeFile).href, { waitUntil: 'load' })
  await page.waitForFunction(() => typeof window.seg === 'function')

  const selectScreen = async (screen) => {
    await page.locator(`.sb-item[data-screen="${screen}"]`).click()
    await page.locator(`.screen[data-pane="${screen}"]`).waitFor({ state: 'visible' })
    await page.evaluate(() => {
      document.querySelectorAll('.content, .chat-thread, .cs-scroll').forEach((element) => {
        element.scrollTop = 0
      })
    })
  }
  const segment = async (set, index) => {
    await page.evaluate(([name, selected]) => window.seg(name, selected), [set, index])
  }
  const selectWorkspaceMode = async (targetPage, mode) => {
    assert.ok(WORKSPACE_MODES.includes(mode), `未知会话工作区状态：${mode}`)
    await targetPage.evaluate((nextMode) => {
      if (typeof window.applyChatWorkspaceMode !== 'function') {
        throw new Error('原型缺少 applyChatWorkspaceMode')
      }
      window.applyChatWorkspaceMode(nextMode)
    }, mode)
    await targetPage.waitForFunction(
      (nextMode) => document.querySelector('.screen[data-pane="chat"] .chat')?.getAttribute('data-workspace-mode') === nextMode,
      mode,
    )
  }

  await selectWorkspaceMode(page, 'sessions')
  await capture(page, outputDir, 'chat-conversation')
  await selectWorkspaceMode(page, 'artifacts')
  await page.locator('#artifactsPanel').waitFor({ state: 'visible' })
  await capture(page, outputDir, 'hero-workspace')

  await selectScreen('agents')
  await segment('ag', 0)
  await capture(page, outputDir, 'agents-overview')
  await segment('ag', 1)
  await capture(page, outputDir, 'agents-templates')

  await selectScreen('knowledge')
  await segment('kn', 0)
  await capture(page, outputDir, 'knowledge-documents')
  await segment('kn', 1)
  await capture(page, outputDir, 'knowledge-memory')

  await selectScreen('automation')
  await segment('au', 0)
  await capture(page, outputDir, 'automation-tasks')
  await segment('au', 1)
  await capture(page, outputDir, 'automation-webhooks')
  await segment('au', 2)
  await capture(page, outputDir, 'automation-workflow')

  await selectScreen('channels')
  await page.evaluate(() => window.ctab(0))
  await capture(page, outputDir, 'connections-channels')
  await page.evaluate(() => window.ctab(1))
  await capture(page, outputDir, 'connections-data-connectors')

  await selectScreen('integration')
  await segment('in', 0)
  await capture(page, outputDir, 'capabilities-skills')
  await segment('in', 1)
  await capture(page, outputDir, 'capabilities-mcp')
  await segment('in', 2)
  await page.evaluate(() => {
    const list = document.querySelector('.screen[data-pane="integration"] [data-sub="in2"] .prompt-list')
    const template = list?.querySelector('.prompt-item:last-child')
    if (!list || !template) return
    const demoPrompts = [
      ['命令', '代码审查', '工程协作'],
      ['Prompt 片段', '周报生成', '办公效率'],
      ['命令', 'SQL 洞察', '数据分析'],
      ['Prompt 片段', '客服回复', '客户服务'],
    ]
    for (const [type, title, category] of demoPrompts) {
      const item = template.cloneNode(true)
      item.querySelector('.hc-tag').textContent = type
      item.querySelector('.hc-tag').className = `hc-tag ${type === '命令' ? 'hc-tag--cmd' : 'hc-tag--prompt'}`
      item.querySelector('.prompt-title').textContent = title
      item.querySelector('.prompt-sub').textContent = category
      item.querySelectorAll('[onclick]').forEach((element) => element.removeAttribute('onclick'))
      list.append(item)
    }
  })
  await capture(page, outputDir, 'capabilities-prompts')

  await selectScreen('logs')
  await page.evaluate(() => {
    const screen = document.querySelector('.screen[data-pane="logs"]')
    const rows = screen?.querySelector('.logrows')
    if (!screen || !rows) return
    const channelMessage = rows.querySelector('[data-src="channels"] .msg')
    if (channelMessage) channelMessage.textContent = 'loaded 6 platform adapters, 2 instances enabled'
    const demoLogs = [
      ['12:49:18', 'DEBUG', 'dbg', 'router', 'route selected · qwen3.5:9b · cost priority'],
      ['12:49:18', 'INFO', 'info', 'agent', '小蟹 · 默认助理 ready · 6 tools mounted'],
      ['12:49:19', 'INFO', 'info', 'mcp', 'filesystem server connected · 3 tools available'],
      ['12:49:21', 'DEBUG', 'dbg', 'memory', 'conversation context restored · 3 memories matched'],
      ['12:49:24', 'INFO', 'info', 'automation', 'daily-feishu schedule registered · next 09:00'],
      ['12:49:26', 'WARN', 'warn', 'webhook', 'github-push waiting for write authorization'],
      ['12:49:29', 'INFO', 'info', 'channels', 'Feishu delivery test passed · 184 ms'],
      ['12:49:31', 'ERROR', 'err', 'connector', 'Redis connector skipped · configuration incomplete'],
    ]
    for (const [time, level, levelClass, source, message] of demoLogs) {
      const row = document.createElement('div')
      row.className = 'logrow'
      row.innerHTML = `<span class="t"></span><span class="lv ${levelClass}"></span><span class="src"></span><span class="msg"></span>`
      row.querySelector('.t').textContent = time
      row.querySelector('.lv').textContent = level
      row.querySelector('.src').textContent = source
      row.querySelector('.msg').textContent = message
      rows.append(row)
    }
    const filters = screen.querySelectorAll('.tbar .seg button')
    ;['全部 (12)', 'Debug (3)', 'Info (6)', 'Warn (2)', 'Error (1)'].forEach((label, index) => {
      if (filters[index]) filters[index].textContent = label
    })
    const footerCount = screen.querySelector('.logfoot > span:nth-child(2)')
    if (footerCount) footerCount.textContent = '12 条日志'
    const footerWarning = screen.querySelector('.logfoot > span:nth-child(4)')
    if (footerWarning) footerWarning.textContent = '警告 2'
  })
  await capture(page, outputDir, 'logs-observability')

  await selectScreen('settings')
  await page.evaluate(() => {
    document.querySelector('.prov-card')?.classList.add('open')
  })
  await capture(page, outputDir, 'settings-model-providers')

  await browser.close()
}

const options = parseArgs(process.argv.slice(2))
if (options.help) {
  process.stdout.write(usage())
  process.exit(0)
}
if (!options.output) throw new Error(`缺少 --output\n\n${usage()}`)

const outputDir = path.resolve(options.output)
fs.mkdirSync(outputDir, { recursive: true })
assertDesktopVersionSource()
const playwrightModule = process.env.HEXCLAW_PLAYWRIGHT_MODULE || defaultPlaywright
const { chromium } = await import(pathToFileURL(playwrightModule).href)

await captureWelcome(chromium, outputDir, options.desktopUrl)
await capturePrototype(chromium, outputDir)
assert.deepEqual([...capturedStems].sort(), [...EXPECTED_CAPTURE_STEMS].sort(), '生成截图与官网 exact-set 不一致')
process.stdout.write(`已生成 19 张 2560×1640 PNG：${outputDir}\n`)
