#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

const repository = 'hexagon-codes/hexclaw-desktop';
const snapshotPath = new URL('../meta/github-stars.json', import.meta.url);

function validSnapshot(value) {
  return value?.repository === repository
    && Number.isSafeInteger(value.count) && value.count >= 0
    && Number.isFinite(Date.parse(value.fetched_at));
}

try {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'hexclaw-site' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
  const response = await fetch('https://api.github.com/repos/' + repository, {
    headers,
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('GitHub response unavailable');
  const data = await response.json();
  const snapshot = {
    repository: data.full_name,
    count: data.stargazers_count,
    fetched_at: new Date().toISOString(),
  };
  if (!validSnapshot(snapshot)) throw new Error('Invalid GitHub count');
  await writeFile(snapshotPath, JSON.stringify(snapshot, null, 2) + '\n');
  console.log('GitHub stars snapshot refreshed.');
} catch {
  let previous;
  try { previous = JSON.parse(await readFile(snapshotPath, 'utf8')); } catch {}
  if (!validSnapshot(previous)) throw new Error('GitHub stars snapshot unavailable.');
  console.warn('GitHub stars unavailable. Retaining the last verified snapshot.');
}
