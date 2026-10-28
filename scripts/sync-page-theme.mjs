#!/usr/bin/env node
// 页面保留静态 HTML，主题实现只从公共脚本加载一次。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const themePath = path.join(root, 'assets/js/theme.js')
const legacyFunction = 'function toggleTheme(){var c=document.documentElement.getAttribute("data-theme");var n=c==="dark"?"light":"dark";document.documentElement.setAttribute("data-theme",n);localStorage.setItem("hexclaw-theme",n)}'
const legacyInit = '(function(){var s=localStorage.getItem("hexclaw-theme");var d=window.matchMedia("(prefers-color-scheme:dark)").matches;if(s==="dark"||(!s&&d))document.documentElement.setAttribute("data-theme","dark")})();'
const legacyScroll = 'window.addEventListener("scroll",function(){var n=document.querySelector(".tn,.topnav");if(n)n.classList.toggle("scrolled",window.scrollY>10);},{passive:true});'

function pages(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? pages(file) : entry.name.endsWith('.html') ? [file] : []
  })
}

let changed = 0
for (const locale of ['zh', 'en', 'ug']) {
  for (const file of pages(path.join(root, locale))) {
    const source = fs.readFileSync(file, 'utf8')
    let content = source.replace(legacyFunction, '').replace(legacyInit, '')
    content = content.replace(/<script>([\s\S]*?)<\/script>/g, (script, code) => code.trim() === legacyScroll ? '' : script)
    if (!/src="[^"]*assets\/js\/theme\.js(?:\?[^\"]*)?"/.test(content)) {
      const reference = path.relative(path.dirname(file), themePath).split(path.sep).join('/')
      content = content.replace(/<script\b[^>]*src="[^"]*assets\/js\/(?:home|docs-nav)\.js[^\"]*"[^>]*><\/script>/,
        (script) => `<script src="${reference}?v=initial"></script>\n${script}`)
    }
    if (content !== source) { fs.writeFileSync(file, content); changed += 1 }
  }
}
process.stdout.write(`Synced shared page theme: ${changed} updated\n`)
