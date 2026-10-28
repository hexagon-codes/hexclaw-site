#!/usr/bin/env node
// 静态生成公众号排版与官网主题之间的适配，不引入运行时依赖。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { adaptBlogArticleStyles } from '../components/blog-article-styles.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let changed = 0
for (const locale of ['zh', 'en', 'ug']) {
  const directory = path.join(root, locale, 'blog')
  for (const name of fs.readdirSync(directory).filter((name) => name.endsWith('.html'))) {
    const file = path.join(directory, name)
    const source = fs.readFileSync(file, 'utf8')
    const content = source.replace(/(<article class="blog-content">)([\s\S]*?)(<\/article>)/,
      (_, start, article, end) => start + adaptBlogArticleStyles(article) + end)
    if (content !== source) { fs.writeFileSync(file, content); changed += 1 }
  }
}
process.stdout.write(`Synced blog article styles: ${changed} updated\n`)
