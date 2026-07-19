import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function walkHtml(dir = root) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", "node_modules"].includes(entry.name)) return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkHtml(full);
    return full.endsWith(".html") ? [full] : [];
  });
}

const htmlFiles = walkHtml();
const read = (file) => fs.readFileSync(file, "utf8");
const relative = (file) => path.relative(root, file);

test("every content page exposes a keyboard skip link and main target", () => {
  const failures = [];
  for (const file of htmlFiles) {
    const html = read(file);
    if (!/<main\b/i.test(html)) continue;
    const skipLink = html.match(/<a\b[^>]*class="[^"]*skip-link[^"]*"[^>]*>/i)?.[0];
    if (!skipLink || !/\bhref="#main"/i.test(skipLink)) {
      failures.push(`${relative(file)}: missing skip link`);
    }
    if (!/<main\b[^>]*\bid="main"/i.test(html)) {
      failures.push(`${relative(file)}: main has no id=main`);
    }
  }
  assert.deepEqual(failures, []);
});

test("every image reserves its intrinsic aspect ratio", () => {
  const failures = [];
  for (const file of htmlFiles) {
    const html = read(file);
    for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
      if (!/\bwidth\s*=/.test(match[0]) || !/\bheight\s*=/.test(match[0])) {
        failures.push(`${relative(file)}: ${match[0]}`);
      }
    }
  }
  assert.deepEqual(failures, []);
});

test("hamburger controls have explicit state and matching controlled navigation", () => {
  const failures = [];
  for (const file of htmlFiles) {
    const html = read(file);
    for (const match of html.matchAll(/<button\b[^>]*class="[^"]*burger[^"]*"[^>]*>/gi)) {
      const button = match[0];
      if (/\bonclick\s*=/.test(button)) failures.push(`${relative(file)}: inline click handler`);
      if (!/\btype="button"/.test(button)) failures.push(`${relative(file)}: missing button type`);
      if (!/\baria-expanded="false"/.test(button)) failures.push(`${relative(file)}: missing collapsed state`);
      const controls = button.match(/\baria-controls="([^"]+)"/);
      if (!controls) failures.push(`${relative(file)}: missing aria-controls`);
      else if (!new RegExp(`\\bid="${controls[1]}"`).test(html)) failures.push(`${relative(file)}: missing #${controls[1]}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("navigation scripts own hamburger state, Escape, and desktop reset", () => {
  for (const file of ["assets/js/home.js", "assets/js/docs-nav.js"]) {
    const source = read(path.join(root, file));
    assert.match(source, /aria-expanded/);
    assert.match(source, /event\.key === "Escape"/);
    assert.match(source, /matchMedia\("\(min-width: 1101px\)"\)/);
  }
});

test("tablet navigation and engine stack use safe responsive guards", () => {
  const home = read(path.join(root, "assets/css/home.css"));
  const docs = read(path.join(root, "assets/css/docs.css"));
  assert.match(home, /@media\s*\(max-width:\s*1100px\)[\s\S]*?\.nav-burger\s*\{\s*display:\s*block/);
  assert.match(home, /@media\s*\(max-width:\s*1100px\)[\s\S]*?\.engine-stack\s*\{[^}]*overflow-x:\s*clip/);
  assert.match(home, /\[dir="rtl"\]\s+\.stack-item::before/);
  assert.match(docs, /@media\s*\(max-width:\s*1100px\)\s*\{\s*\.tn-burger,\s*\.topnav-burger/);
});

test("styles animate explicit properties and expose keyboard focus", () => {
  for (const file of ["assets/css/home.css", "assets/css/docs.css"]) {
    const source = read(path.join(root, file));
    assert.doesNotMatch(source, /transition\s*:\s*all\b/);
    assert.match(source, /(?:a|:where\(a, button\)).*:focus-visible/);
  }
});
