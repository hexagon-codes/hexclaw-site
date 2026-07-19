import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const root = new URL('..', import.meta.url)
const pages = ['privacy', 'terms', 'third-party-ai-services']
const contentPages = [
  ['about', 'about-page'],
  ['changelog', 'changelog-page'],
  ['privacy', 'legal-page'],
  ['terms', 'legal-page'],
  ['third-party-ai-services', 'legal-page'],
]

const read = (path) => readFileSync(new URL(path, root), 'utf8')

test('Chinese legal pages opt into the shared content reading layout', () => {
  for (const page of pages) {
    const html = read(`zh/${page}.html`)

    assert.match(html, /<body class="docs-page content-page legal-page">/)
    assert.match(html, /<main\b(?=[^>]*\bid="main")(?=[^>]*\bclass="m content-main")[^>]*>/)
    assert.doesNotMatch(html, /<main[^>]+style=/)
  }
})

test('legal reading layout is centered and removes inherited lead spacing', () => {
  const css = read('assets/css/docs.css')

  assert.match(css, /\.content-page \.content-main\s*\{[^}]*margin:\s*0 auto;/s)
  assert.match(css, /\.content-page \.page-lead \.sub\s*\{[^}]*margin-bottom:\s*0;/s)
  assert.match(css, /@media \(max-width:\s*1100px\)[\s\S]*\.content-page \.tn-burger/s)
})

test('Chinese top-level content pages share one responsive page system', () => {
  for (const [page, subtype] of contentPages) {
    const html = read(`zh/${page}.html`)

    assert.match(html, new RegExp(`<body class="docs-page content-page ${subtype}">`))
    assert.match(html, /<main\b(?=[^>]*\bid="main")(?=[^>]*\bclass="m content-main")[^>]*>/)
    assert.doesNotMatch(html, /<main[^>]+style=/)
  }
})

test('changelog releases use aligned card groups within the shared reading width', () => {
  const css = read('assets/css/docs.css')

  assert.match(css, /\.changelog-page \.content-main > h2\s*\{/)
  assert.match(css, /\.changelog-page \.content-main > h2 \+ ul\s*\{/)
  assert.match(css, /@media \(max-width:\s*1100px\)[\s\S]*\.content-page \.tn-burger/s)
})
