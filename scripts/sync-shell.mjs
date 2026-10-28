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

function getLocalizedLinks(relPath) {
  const afterLang = relPath.replace(/^(?:zh|en|ug)\//, '')
  if (relPath.includes('/blog/')) {
    return {
      zh: `/${relPath.replace(/\.html$/, '').replace(/\/index$/, '/')}`,
      en: '/en/',
      ug: '/ug/',
    }
  }
  let canonicalPath = afterLang.replace(/\.html$/, '')
  if (canonicalPath === 'index') canonicalPath = ''
  else if (canonicalPath.endsWith('/index')) canonicalPath = canonicalPath.slice(0, -5)

  return {
    zh: canonicalPath ? `/zh/${canonicalPath}` : '/zh/',
    en: canonicalPath ? `/en/${canonicalPath}` : '/en/',
    ug: canonicalPath ? `/ug/${canonicalPath}` : '/ug/',
  }
}

function generateNav(lang, relPath) {
  const isHome = path.basename(relPath) === 'index.html' && !relPath.includes('/docs/') && !relPath.includes('/blog/')
  const isSubdir = relPath.includes('/docs/') || relPath.includes('/blog/')
  const assetPrefix = isSubdir ? '../../' : '../'
  const t = I18N[lang]
  const links = getLocalizedLinks(relPath)

  if (isHome) {
    return `  <nav class="nav" id="nav">
    <a href="./" class="nav-brand"><img width="72" height="72" src="../assets/brand/hexclaw-icon-72.png" class="nav-logo" alt="${t.brandName}"><span class="nav-name">${t.brandName}</span></a>
    <button type="button" class="nav-burger" aria-label="${t.menuAria}" aria-expanded="false" aria-controls="primary-navigation"><span></span><span></span><span></span></button>
    <div class="nav-links" id="primary-navigation">
      <a href="#cases">${t.nav.cases}</a><a href="#features">${t.nav.features}</a><a href="#quickstart">${t.nav.quickstart}</a><a href="#ecosystem">${t.nav.ecosystem}</a>
      <a href="/zh/blog/">${t.nav.blog}</a>
      <a href="/${lang}/docs/">${t.nav.docs}</a>
      <div class="lang-menu" data-lang-menu><button type="button" class="lang-trigger" aria-haspopup="menu" aria-expanded="false" aria-label="${t.langAria}"><svg class="lang-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 0 20"></path><path d="M12 2a15.3 15.3 0 0 0 0 20"></path></svg><span class="lang-current"${lang === 'ug' ? ' lang="zh-CN" dir="ltr"' : ''}>${t.langCurrent}</span><svg class="lang-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg></button><div class="lang-menu-list" role="menu"><a href="/zh/" role="menuitem"${lang === 'zh' ? ' class="is-active" aria-current="true"' : ''}>中文</a><a href="/en/" role="menuitem"${lang === 'en' ? ' class="is-active" aria-current="true"' : ''}>English</a><a href="/ug/" role="menuitem"${lang === 'ug' ? ' class="is-active" aria-current="true"' : ''} lang="zh-CN" dir="ltr">维吾尔语</a></div></div>
      <button type="button" class="nav-theme-toggle" onclick="toggleTheme()" aria-label="${t.themeAria}">
        <svg class="theme-icon-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
        <svg class="theme-icon-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </button>
      <a href="https://github.com/hexagon-codes/hexclaw-desktop" target="_blank" rel="noopener noreferrer" class="nav-cta">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
        GitHub
        <span class="nav-star-badge" id="gh-stars">&#9733;</span>
      </a>
    </div>
  </nav>`
  }

  const isBlog = relPath.startsWith('zh/blog/')
  const isDocs = relPath.includes('/docs/')

  return `<nav class="tn topnav" id="nav">
  <a href="/${lang}/" class="tn-b topnav-brand"><img width="72" height="72" src="${assetPrefix}assets/brand/hexclaw-icon-72.png" class="tn-l topnav-logo" alt="${t.brandName}"><span class="tn-n topnav-name">${t.brandName}</span></a>
  <button type="button" class="tn-burger topnav-burger" aria-label="${t.menuAria}" aria-expanded="false" aria-controls="primary-navigation"><span></span><span></span><span></span></button><div class="tn-r topnav-links" id="primary-navigation"><a href="/${lang}/">${t.nav.home}</a><a href="/${lang}/#cases">${t.nav.cases}</a><a href="/${lang}/#features">${t.nav.features}</a><a href="/${lang}/#quickstart">${t.nav.quickstart}</a><a href="/${lang}/#ecosystem">${t.nav.ecosystem}</a><a href="/zh/blog/"${isBlog ? ' class="is-active"' : ''}>${t.nav.blog}</a><a href="/${lang}/docs/"${isDocs ? ' class="is-active"' : ''}>${t.nav.docs}</a><div class="lang-menu" data-lang-menu><button type="button" class="lang-trigger" aria-haspopup="menu" aria-expanded="false" aria-label="${t.langAria}"><svg class="lang-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 0 20"></path><path d="M12 2a15.3 15.3 0 0 0 0 20"></path></svg><span class="lang-current"${lang === 'ug' ? ' lang="zh-CN" dir="ltr"' : ''}>${t.langCurrent}</span><svg class="lang-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg></button><div class="lang-menu-list" role="menu"><a href="${links.zh}" role="menuitem"${lang === 'zh' ? ' class="is-active" aria-current="true"' : ''}>中文</a><a href="${links.en}" role="menuitem"${lang === 'en' ? ' class="is-active" aria-current="true"' : ''}>English</a><a href="${links.ug}" role="menuitem"${lang === 'ug' ? ' class="is-active" aria-current="true"' : ''} lang="zh-CN" dir="ltr">维吾尔语</a></div></div><button type="button" class="theme-toggle" onclick="toggleTheme()" aria-label="${t.themeAria}"><svg class="ti-sun" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg><svg class="ti-moon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></button><a href="https://github.com/hexagon-codes/hexclaw-desktop" target="_blank" rel="noopener noreferrer" class="nav-cta">GitHub <span class="nav-star-badge" id="gh-stars">&#9733;</span></a></div>
</nav>`
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

  // Check if topnav exists
  const navRegex = /<nav\b[^>]*class="[^"]*(?:tn|topnav|\bnav\b)[^"]*"[\s\S]*?<\/nav>/i
  if (navRegex.test(content)) {
    content = content.replace(navRegex, generateNav(lang, relPath))
  }

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
