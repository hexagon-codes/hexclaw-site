// 官网首页、博客与公众号共用品牌资料和最新宣传语。
export const articleBrand = Object.freeze({
  website: 'hexclaw.net',
  github: 'hexagon-codes',
  weibo: '@HexClaw',
  x: '@hexclawapp',
  email: 'ai@hexclaw.net',
})

const contactLinks = Object.freeze({
  website: 'https://hexclaw.net',
  github: 'https://github.com/hexagon-codes',
  weibo: 'https://weibo.com/u/4097207240',
  x: 'https://x.com/hexclawapp',
})

const locales = Object.freeze({
  zh: {
    brand: 'HexClaw 河蟹 AI',
    tagline: '本地云端均可部署 · 数据自主掌控 · 软件开源免费',
    websitePrefix: '官网 ',
    githubPrefix: 'GitHub ',
    weiboPrefix: '微博 ',
    xPrefix: 'X ',
    emailPrefix: '邮箱：',
  },
  en: {
    brand: 'HexClaw',
    tagline: 'Deploy locally or in the cloud · Control your data · Free and open-source software',
    websitePrefix: 'Website: ',
    githubPrefix: 'GitHub: ',
    weiboPrefix: 'Weibo: ',
    xPrefix: 'X: ',
    emailPrefix: 'Email: ',
  },
  ug: {
    brand: 'HexClaw ھېشى AI',
    tagline: 'يەرلىكتە ياكى بۇلۇتتا ئورۇنلاشتۇرۇش · سانلىق مەلۇماتنى ئۆزىڭىز باشقۇرۇش · ئوچۇق كودلۇق ۋە ھەقسىز يۇمشاق دېتال',
    websitePrefix: 'تور بېكەت: ',
    githubPrefix: 'GitHub: ',
    weiboPrefix: 'Weibo: ',
    xPrefix: 'X: ',
    emailPrefix: 'ئېلخەت: ',
  },
})

export function escapeFooterHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}

export function footerDefaults(locale = 'zh') {
  if (!locales[locale]) throw new Error(`Unsupported footer locale: ${locale}`)
  return { ...articleBrand, ...locales[locale], showSocial: true }
}

export function footerOverrides(locale, values) {
  const defaults = footerDefaults(locale)
  return Object.fromEntries(Object.keys(defaults)
    .filter((key) => Object.hasOwn(values, key) && values[key] !== defaults[key])
    .map((key) => [key, values[key]]))
}

export function renderBlogBrandFooter({ locale = 'zh', overrides = {}, target = 'blog' } = {}) {
  const values = { ...footerDefaults(locale), ...overrides }
  // 公众号使用完整内联颜色；官网复用主题变量，保持深浅主题可读。
  const colors = target === 'wechat'
    ? { text: '#7b8fa3', brand: '#12324c', contact: '#5fb3ea', email: '#999' }
    : {
        text: 'var(--article-muted, #7b8fa3)',
        brand: 'var(--article-ink, #12324c)',
        contact: 'var(--article-accent, #5fb3ea)',
        email: 'var(--article-muted, #999)',
      }
  const e = escapeFooterHtml
  const identifier = (value) => target === 'wechat' ? e(value) : `<bdi dir="ltr">${e(value)}</bdi>`
  // 官网提供可点击入口；公众号保留纯文本，使用相同文案与颜色。
  const contact = (prefix, value, href) => target === 'wechat'
    ? `<span style="color: ${colors.contact};">${e(prefix)}${identifier(value)}</span>`
    : `<a href="${e(href)}" target="_blank" rel="noopener noreferrer" style="color: ${colors.contact}; text-decoration: none;">${e(prefix)}${identifier(value)}</a>`
  const metadata = target === 'wechat' ? '' : ` class="blog-brand-footer" data-blog-brand-footer="${e(locale)}" data-blog-brand-overrides="${e(JSON.stringify(footerOverrides(locale, overrides)))}"`
  const rows = [
    `<strong style="color: ${colors.brand}; font-size: 14px;">${e(values.brand)}</strong>`,
    e(values.tagline),
    `${contact(values.websitePrefix, values.website, contactLinks.website)}&nbsp;&nbsp;|&nbsp;&nbsp;${contact(values.githubPrefix, values.github, contactLinks.github)}`,
  ]
  if (values.showSocial) rows.push(`${contact(values.weiboPrefix, values.weibo, contactLinks.weibo)}&nbsp;&nbsp;|&nbsp;&nbsp;${contact(values.xPrefix, values.x, contactLinks.x)}`)
  const emailLabel = `${e(values.emailPrefix)}${identifier(values.email)}`
  rows.push(target === 'wechat'
    ? `<span style="color: ${colors.email};">${emailLabel}</span>`
    : `<a href="mailto:${e(values.email)}" style="color: ${colors.email}; text-decoration: none;">${emailLabel}</a>`)
  return `<p${metadata} style="text-align: center; color: ${colors.text}; font-size: 13px; margin: 16px 0 0; line-height: 2;">\n${rows.join('<br/>\n')}\n</p>`
}

export function renderWeChatBrandFooter(overrides = {}) {
  return renderBlogBrandFooter({ locale: 'zh', overrides, target: 'wechat' })
}
