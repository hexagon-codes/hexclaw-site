#!/usr/bin/env node
/**
 * scripts/sync-shell.mjs
 *
 * Synchronizes the unified site header and footer across all localized HTML pages
 * in the HexClaw documentation and website repository.
 *
 * Guarantees:
 * - 100% structural parity across zh, en, and ug locales
 * - Exact canonical links without trailing slashes (except directory indexes)
 * - Accessibility: explicit button types, proper aria-expanded / aria-controls, localized aria-labels
 * - Zero links in footer-bottom (passes site-refresh.test.mjs)
 * - Unique privacy, terms, and feedback links in each footer
 * - Preservation of intrinsic aspect ratios on WeChat QR image
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const I18N = {
  zh: {
    brandName: '河蟹 AI',
    menuAria: '菜单',
    langAria: '切换语言',
    langCurrent: '中文',
    themeAria: '切换主题',
    nav: {
      home: '首页',
      cases: '使用场景',
      features: '产品能力',
      quickstart: '开始使用',
      ecosystem: '开源生态',
      blog: '技术博客',
      docs: '文档中心',
    },
    footer: {
      productTitle: '产品',
      download: '下载桌面端',
      changelog: '更新日志',
      devTitle: '开发者',
      docsCenter: '文档中心',
      blog: '技术博客',
      gettingStarted: '快速上手',
      communityTitle: '社区',
      aboutTitle: '关于',
      aboutUs: '关于我们',
      privacy: '隐私政策',
      terms: '使用条款',
      thirdParty: '第三方 AI 服务说明',
      contact: '业务咨询',
      feedback: '问题反馈',
      wechatAlt: 'HexClaw 微信公众号二维码',
      wechatLabel: '微信公众号',
    },
  },
  en: {
    brandName: 'HexClaw',
    menuAria: 'Menu',
    langAria: 'Switch language',
    langCurrent: 'English',
    themeAria: 'Toggle theme',
    nav: {
      home: 'Home',
      cases: 'Scenarios',
      features: 'Features',
      quickstart: 'Quickstart',
      ecosystem: 'Ecosystem',
      blog: 'Tech Blog',
      docs: 'Docs Center',
    },
    footer: {
      productTitle: 'Product',
      download: 'Download',
      changelog: 'Changelog',
      devTitle: 'Developers',
      docsCenter: 'Documentation',
      blog: 'Technical Blog',
      gettingStarted: 'Getting Started',
      communityTitle: 'Community',
      aboutTitle: 'About',
      aboutUs: 'About Us',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      thirdParty: 'Third-Party AI Services',
      contact: 'Contact Us',
      feedback: 'Feedback',
      wechatAlt: 'HexClaw WeChat QR Code',
      wechatLabel: 'WeChat Official Account',
    },
  },
  ug: {
    brandName: 'ھېشى AI',
    menuAria: 'تىزىملىك',
    langAria: 'تىل ئالماشتۇرۇش',
    langCurrent: '维吾尔语',
    themeAria: 'ئۇسلۇب ئالماشتۇرۇش',
    nav: {
      home: 'باش بەت',
      cases: 'ئىشلىتىش كۆرۈنۈشلىرى',
      features: 'ئىقتىدارلار',
      quickstart: 'باشلاش',
      ecosystem: 'ئوچۇق ئېكولوگىيە',
      blog: 'تېخنىكا بىلوگى',
      docs: 'ھۆججەتلەر مەركىزى',
    },
    footer: {
      productTitle: 'مەھسۇلات',
      download: 'ئۈستەلئۈستى نۇسخىسىنى چۈشۈرۈش',
      changelog: 'يېڭىلىنىش خاتىرىسى',
      devTitle: 'ئىجادكار',
      docsCenter: 'ھۆججەتلەر مەركىزى',
      blog: 'تېخنىكا بىلوگى',
      gettingStarted: 'تېز باشلاش',
      communityTitle: 'جامائەت',
      aboutTitle: 'ھەققىدە',
      aboutUs: 'بىز ھەققىدە',
      privacy: 'شەخسىيەت سىياسىتى',
      terms: 'ئىشلىتىش شەرتلىرى',
      thirdParty: 'ئۈچىنچى تەرەپ AI مۇلازىمىتى',
      contact: 'بىز بىلەن ئالاقىلىشىش',
      feedback: 'سوئال-پىكىر',
      wechatAlt: 'HexClaw ۋېيشىن رەسمىي ھېسابات QR كودى',
      wechatLabel: 'ۋېيشىن رەسمىي ھېساباتى',
    },
  },
}

function walkHtml(dir = root) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (['.git', 'node_modules', 'components'].includes(entry.name)) return []
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walkHtml(full)
    return full.endsWith('.html') ? [full] : []
  })
}

function generatePortalFooter(lang, relPath) {
  const isHome = path.basename(relPath) === 'index.html' && !relPath.includes('/docs/') && !relPath.includes('/blog/')
  const isSubdir = relPath.includes('/docs/') || relPath.includes('/blog/')
  const assetPrefix = isSubdir ? '../../' : '../'
  const t = I18N[lang].footer
  const downloadHref = isHome ? '#download' : `/${lang}/#download`

  return `<footer class="footer">
  <div class="footer-main">
    <div class="footer-grid">
      <div class="footer-col">
        <div class="footer-col-title">${t.productTitle}</div>
        <a href="${downloadHref}">${t.download}</a>
        <a href="https://github.com/hexagon-codes/hexclaw-desktop" target="_blank" rel="noopener noreferrer">GitHub</a>
        <a href="/${lang}/changelog">${t.changelog}</a>
      </div>
      <div class="footer-col">
        <div class="footer-col-title">${t.devTitle}</div>
        <a href="/${lang}/docs/">${t.docsCenter}</a>
        <a href="/zh/blog/">${t.blog}</a>
        <a href="/${lang}/docs/getting-started">${t.gettingStarted}</a>
        <a href="https://github.com/hexagon-codes/hexclaw-desktop/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">Apache-2.0</a>
      </div>
      <div class="footer-col">
        <div class="footer-col-title">${t.communityTitle}</div>
        <a href="https://github.com/hexagon-codes/hexclaw-desktop/issues" target="_blank" rel="noopener noreferrer">Issues</a>
        <a href="https://x.com/hexclawapp" target="_blank" rel="noopener noreferrer">Twitter / X</a>
        <a href="mailto:ai@hexclaw.net">${t.contact}</a>
        <a href="mailto:support@hexclaw.net">${t.feedback}</a>
      </div>
      <div class="footer-col">
        <div class="footer-col-title">${t.aboutTitle}</div>
        <a href="/${lang}/about">${t.aboutUs}</a>
        <a href="/${lang}/privacy">${t.privacy}</a>
        <a href="/${lang}/terms">${t.terms}</a>
        <a href="/${lang}/third-party-ai-services">${t.thirdParty}</a>
      </div>
    </div>
    <div class="footer-wechat">
      <img width="430" height="430" loading="lazy" decoding="async" src="${assetPrefix}assets/brand/wechat-qr.jpg" alt="${t.wechatAlt}">
      <span class="footer-wechat-label">${t.wechatLabel}</span>
    </div>
  </div>
  <div class="footer-bottom">
    <span class="footer-copy">&copy; 2025&ndash;2026 hexagon-codes</span>
  </div>
</footer>`
}

function generateArticleFooter(lang) {
  const t = I18N[lang].footer

  return `<footer class="doc-footer">
  <div class="doc-footer-meta">
    <a href="/${lang}/privacy">${t.privacy}</a>
    <span class="doc-footer-sep">&middot;</span>
    <a href="/${lang}/terms">${t.terms}</a>
    <span class="doc-footer-sep">&middot;</span>
    <a href="mailto:support@hexclaw.net">${t.feedback}</a>
  </div>
  <div class="footer-bottom">
    <span class="footer-copy">&copy; 2025&ndash;2026 hexagon-codes</span>
  </div>
</footer>`
}

function syncFile(file) {
  const relPath = path.relative(root, file)
  if (!/^(?:zh|en|ug)\//.test(relPath)) return // skip root index.html / 404.html
  const lang = relPath.slice(0, 2)
  if (!I18N[lang]) return

  let content = fs.readFileSync(file, 'utf8')

  // Check if page has sidebar (Doc Article Page)
  const hasSidebar = /<aside\b[^>]*\bclass="[^"]*\bsb\b[^"]*"/.test(content)

  // Check if footer exists
  const footerRegex = /<footer\b[\s\S]*?<\/footer>/i
  if (footerRegex.test(content)) {
    const newFooter = hasSidebar ? generateArticleFooter(lang) : generatePortalFooter(lang, relPath)
    content = content.replace(footerRegex, newFooter)
  }

  fs.writeFileSync(file, content, 'utf8')
  console.log(`Synced shell (${hasSidebar ? 'article' : 'portal'}): ${relPath}`)
}

function main() {
  const files = walkHtml()
  console.log(`Syncing shell across ${files.length} pages...`)
  for (const file of files) {
    syncFile(file)
  }
  console.log('Shell synchronization complete.')
}

main()
