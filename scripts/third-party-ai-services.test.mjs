import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = new URL('..', import.meta.url).pathname
const locales = {
  zh: { lang: 'zh-CN', label: '第三方 AI 服务与数据说明' },
  en: { lang: 'en', label: 'Third-Party AI Services &amp; Data Notice' },
  ug: { lang: 'ug', label: 'ئۈچىنچى تەرەپ AI مۇلازىمىتى ۋە سانلىق مەلۇمات چۈشەندۈرۈشى' },
}

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8')
}

test('publishes one localized, indexable service notice per supported locale', () => {
  for (const [locale, expected] of Object.entries(locales)) {
    const relativePath = `${locale}/third-party-ai-services.html`
    assert.equal(existsSync(join(root, relativePath)), true, `${relativePath} is missing`)

    const html = read(relativePath)
    assert.match(html, new RegExp(`<html lang="${expected.lang}"${locale === 'ug' ? ' dir="rtl"' : ''}>`))
    assert.ok(html.includes(`<h1>${expected.label}</h1>`), `${relativePath} must use a localized heading`)
    assert.ok(html.includes(`https://hexclaw.net/${locale}/third-party-ai-services`))
    assert.ok(html.includes('hreflang="en" href="https://hexclaw.net/en/third-party-ai-services"'))
    assert.ok(html.includes('hreflang="zh-CN" href="https://hexclaw.net/zh/third-party-ai-services"'))
    assert.ok(html.includes('hreflang="ug" href="https://hexclaw.net/ug/third-party-ai-services"'))
    assert.ok(html.includes('hreflang="x-default" href="https://hexclaw.net/zh/third-party-ai-services"'))
    for (const linkedLocale of Object.keys(locales)) {
      assert.ok(html.includes(`href="/${linkedLocale}/third-party-ai-services"`))
      assert.ok(!html.includes(`href="/${linkedLocale}/third-party-ai-services/"`))
    }
    assert.ok(html.includes('2026-07-19'))
    assert.ok(html.includes('../assets/css/docs.css'))
    assert.ok(html.includes('../assets/js/docs-nav.js'))

    const jsonLdBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    assert.ok(jsonLdBlocks.length >= 2, `${relativePath} needs WebPage and Breadcrumb JSON-LD`)
    for (const block of jsonLdBlocks) assert.doesNotThrow(() => JSON.parse(block[1]))
  }
})

test('uses the same legal-page header hierarchy as privacy and terms pages', () => {
  for (const locale of Object.keys(locales)) {
    const html = read(`${locale}/third-party-ai-services.html`)
    assert.match(
      html,
      /<main class="m" style="margin-left:0">\s*<header class="page-lead">\s*<h1>/,
      `${locale} service notice must start its page lead with the title`,
    )
    assert.ok(
      !html.includes('class="page-kicker"'),
      `${locale} service notice must not add a header tier absent from the other legal pages`,
    )
  }
})

test('explains the real local/cloud data path and user controls without blanket waivers', () => {
  const zh = read('zh/third-party-ai-services.html')

  for (const phrase of [
    '本地优先',
    '由你配置的第三方 Provider 提供',
    '规范化文本分块',
    '查询文本',
    '原始文件名',
    '本地路径',
    '计费',
    '留存',
    '模型训练',
    '未满 14 周岁',
    '监护人同意',
    '敏感个人信息',
    '跨境',
    '法定权利',
  ]) {
    assert.ok(zh.includes(phrase), `Chinese notice is missing: ${phrase}`)
  }

  assert.ok(zh.includes('本地模型'))
  assert.ok(zh.includes('纯文本检索'))
  assert.ok(zh.includes('mailto:support@hexclaw.net'))
  assert.ok(!zh.includes('本应用完全是一个壳'))
  assert.ok(!zh.includes('网站声明即完成合规'))
  assert.ok(!zh.includes('完全免责'))
})

test('links authoritative rules and scopes legal responsibility to actual functions', () => {
  const zh = read('zh/third-party-ai-services.html')
  assert.ok(zh.includes('https://www.cac.gov.cn/2019-08/23/c_1124913903.htm'))
  assert.ok(zh.includes('https://www.cac.gov.cn/2023-10/24/c_1699806932316206.htm'))
  assert.ok(zh.includes('https://www.cac.gov.cn/2023-07/13/c_1690898327029107.htm'))
  assert.ok(zh.includes('实际部署方式和所提供的功能'))
  assert.ok(zh.includes('不能替代依法需要履行的告知、同意'))
})

test('keeps discovery, compatibility redirects, and sitemap in sync', () => {
  for (const locale of Object.keys(locales)) {
    assert.ok(read(`${locale}/terms.html`).includes(`/${locale}/third-party-ai-services`))
    assert.ok(read(`${locale}/index.html`).includes(`/${locale}/third-party-ai-services`))
    assert.ok(read('sitemap.xml').includes(`<loc>https://hexclaw.net/${locale}/third-party-ai-services</loc>`))
    assert.ok(read('_redirects').includes(`/${locale}/third-party-ai-services.html /${locale}/third-party-ai-services 301`))
  }

  const redirects = read('_redirects')
  assert.ok(redirects.includes('/third-party-ai-services /zh/third-party-ai-services 301'))
  assert.ok(redirects.includes('/docs/third-party-providers /zh/third-party-ai-services 301'))

  for (const termsPath of ['zh/terms.html', 'en/terms.html', 'ug/terms.html']) {
    assert.match(read(termsPath), /(?:法律不允许排除|cannot lawfully be excluded|قانۇن بويىچە چەتكە قېقىشقا بولمايدىغان)/)
  }
})

test('keeps privacy summaries consistent with configured cloud data flows', () => {
  const forbiddenAbsoluteClaims = {
    zh: '所有数据均在本地处理',
    en: 'All data is processed locally on your device',
    ug: 'بارلىق سانلىق-مەلۇمات يەرلىكتە بىر تەرەپ قىلىنىدۇ',
  }

  for (const [locale, forbiddenClaim] of Object.entries(forbiddenAbsoluteClaims)) {
    const privacy = read(`${locale}/privacy.html`)
    assert.ok(privacy.includes(`/${locale}/third-party-ai-services`))
    assert.ok(!privacy.includes(forbiddenClaim), `${locale} privacy still makes an absolute local-only claim`)
    assert.ok(!privacy.includes('Keychain / Credential Manager'), `${locale} privacy overstates the current credential store`)
  }
})
