import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const root = new URL('..', import.meta.url)
const pages = ['privacy', 'terms', 'third-party-ai-services']

const read = (path) => readFileSync(new URL(path, root), 'utf8')

test('Chinese legal pages opt into the dedicated legal reading layout', () => {
  for (const page of pages) {
    const html = read(`zh/${page}.html`)

    assert.match(html, /<body class="docs-page legal-page">/)
    assert.match(html, /<main class="m legal-main">/)
    assert.doesNotMatch(html, /<main[^>]+style=/)
  }
})

test('legal reading layout is centered and removes inherited lead spacing', () => {
  const css = read('assets/css/docs.css')

  assert.match(css, /\.legal-page \.legal-main\s*\{[^}]*margin:\s*0 auto;/s)
  assert.match(css, /\.legal-page \.page-lead \.sub\s*\{[^}]*margin-bottom:\s*0;/s)
  assert.match(css, /@media \(max-width:\s*1100px\)[\s\S]*\.legal-page \.tn-burger/s)
})
