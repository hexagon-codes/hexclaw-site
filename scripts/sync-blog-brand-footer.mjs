#!/usr/bin/env node
// 统一首页宣传语与博客品牌段；公众号模板可直接导出为内联 HTML。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  footerDefaults,
  escapeFooterHtml,
  renderBlogBrandFooter,
  renderWeChatBrandFooter,
} from '../components/blog-brand-footer.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const options = new Set(process.argv.slice(2))
for (const option of options) {
  if (!['--wechat-template', '--dry-run'].includes(option)) throw new Error(`Unknown option: ${option}`)
}

function prepare(file, locale) {
  const source = fs.readFileSync(file, 'utf8')
  const article = /(<article\b[^>]*class="[^"]*\bblog-content\b[^"]*"[^>]*>)([\s\S]*?)(<\/article>)/.exec(source)
  if (!article) return { file, status: 'skipped' }
  const paragraph = [...article[2].matchAll(/<p\b[^>]*>[\s\S]*?<\/p>/gi)].at(-1)
  if (!paragraph) throw new Error('Missing article closing paragraph')
  const hasBrandFooter = paragraph[0].includes('ai@hexclaw.net') &&
    (paragraph[0].includes('data-blog-brand-footer=') || /<strong\b[^>]*>\s*HexClaw\b/i.test(paragraph[0]))
  const hasLegacyContact = path.basename(file) === 'architecture-deep-dive.html' &&
    paragraph[0].includes('hexclaw.net') && paragraph[0].includes('github.com/hexagon-codes/hexclaw')
  if (!hasBrandFooter && !hasLegacyContact) throw new Error('Unrecognized article brand footer')
  const footer = renderBlogBrandFooter({ locale })
  const offset = article.index + article[1].length + paragraph.index
  const content = source.slice(0, offset) + footer + source.slice(offset + paragraph[0].length)
  return { file, status: content === source ? 'unchanged' : 'updated', content }
}

function prepareHome(locale) {
  const file = path.join(root, locale, 'index.html')
  const source = fs.readFileSync(file, 'utf8')
  const pill = /(<div class="trust-hero-pill">[\s\S]*?<span>)[\s\S]*?(<\/span>\s*<\/div>)/
  if (!pill.test(source)) throw new Error(`${locale}: Missing home brand tagline`)
  const content = source.replace(pill, (_, before, after) => `${before}${escapeFooterHtml(footerDefaults(locale).tagline)}${after}`)
  return { file, status: content === source ? 'unchanged' : 'updated', content }
}

if (options.has('--wechat-template')) {
  process.stdout.write(`${renderWeChatBrandFooter()}\n`)
} else {
  const plans = []
  for (const locale of ['zh', 'en', 'ug']) {
    plans.push(prepareHome(locale))
    const directory = path.join(root, locale, 'blog')
    for (const name of fs.readdirSync(directory).filter((name) => name.endsWith('.html')).sort()) {
      const file = path.join(directory, name)
      try { plans.push(prepare(file, locale)) }
      catch (error) { throw new Error(`${path.relative(root, file)}: ${error.message}`, { cause: error }) }
    }
  }
  // 先解析全部目标，再执行写入，避免格式错误留下半批次结果。
  if (!options.has('--dry-run')) {
    for (const plan of plans) if (plan.status === 'updated') fs.writeFileSync(plan.file, plan.content)
  }
  const counts = { updated: 0, unchanged: 0, skipped: 0 }
  for (const plan of plans) counts[plan.status] += 1
  process.stdout.write(`${options.has('--dry-run') ? 'Preview' : 'Synced'} blog brand footers: ${JSON.stringify(counts)}\n`)
}
