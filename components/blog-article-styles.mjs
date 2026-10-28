// 公众号内联排版保留浅色原值，官网深色主题通过局部变量适配。
const textColors = new Map([
  ['#12324c', 'ink'],
  ['#3f5f7b', 'secondary'],
  ['#5f7b9c', 'secondary'],
  ['#7b8fa3', 'muted'],
  ['#a5bdd3', 'muted'],
  ['#9db2c4', 'muted'],
  ['#999', 'muted'],
  ['#999999', 'muted'],
  ['#3f8fd4', 'accent'],
  ['#5fb3ea', 'accent'],
])

const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'])

function lightColor(value) {
  const color = value.trim().toLowerCase()
  if (/^#[0-9a-f]{3}$/.test(color)) return lightColor('#' + [...color.slice(1)].map((c) => c + c).join(''))
  if (/^#[0-9a-f]{6}$/.test(color)) {
    const rgb = [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16))
    return Math.min(...rgb) >= 215
  }
  const rgba = /^rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*([\d.]+)\s*\)$/.exec(color)
  return rgba ? Number(rgba[1]) >= 0.8 : color === 'white'
}

function adaptStyle(style) {
  return style.replace(/((?:^|;)\s*)(color|background(?:-color)?|border(?:-(?:top|right|bottom|left|inline-start|inline-end))?(?:-color)?)\s*:\s*([^;]*)/gi,
    (whole, prefix, property, rawValue) => {
      if (rawValue.includes('var(')) return whole
      const value = rawValue.trim()
      if (property.toLowerCase() === 'color') {
        const role = textColors.get(value.toLowerCase())
        return role ? `${prefix}${property}:var(--article-${role}, ${value})` : whole
      }
      if (/^background/i.test(property)) {
        return lightColor(value) ? `${prefix}${property}:var(--article-panel, ${value})` : whole
      }
      return whole.replace(/#[0-9a-f]{3,6}\b/gi, (color) => lightColor(color) ? `var(--article-border, ${color})` : color)
    })
}

export function adaptBlogArticleStyles(html) {
  const stack = []
  return html.replace(/<!--[\s\S]*?-->|<\/?[a-z][^>]*>/gi, (tag) => {
    if (tag.startsWith('<!--')) return tag
    const match = /^<(\/?)([a-z][\w:-]*)/i.exec(tag)
    if (!match) return tag
    const name = match[2].toLowerCase()
    if (match[1]) {
      const index = stack.findLastIndex((entry) => entry.name === name)
      if (index >= 0) stack.splice(index)
      return tag
    }
    const style = /\bstyle="([^"]*)"/i.exec(tag)?.[1] || ''
    // 程序和语法着色容器沿用原稿固定深色方案，不套正文主题色。
    const program = Boolean(stack.at(-1)?.program || name === 'pre' ||
      (name === 'code' && /display\s*:\s*block/i.test(style)) || /font-family:[^;]*monospace/i.test(style))
    if (!voidTags.has(name) && !/\/>$/.test(tag)) stack.push({ name, program })
    if (program || !style) return tag
    return tag.replace(/\bstyle="([^"]*)"/i, (_, value) => `style="${adaptStyle(value)}"`)
  })
}
