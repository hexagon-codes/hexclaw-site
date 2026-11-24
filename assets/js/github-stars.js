// 同源真实快照先显示，浏览器缓存跨页面复用；公开 API 按小时补充刷新。
(() => {
  const repository = 'hexagon-codes/hexclaw-desktop';
  const storageKey = 'hexclaw-github-stars-v1';
  const refreshInterval = 60 * 60 * 1000;
  const badge = document.getElementById('gh-stars');
  if (!badge) return;

  function validSnapshot(value) {
    return value?.repository === repository
      && Number.isSafeInteger(value.count) && value.count >= 0
      && Number.isFinite(Date.parse(value.fetched_at));
  }

  function readCache() {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey));
      return value?.repository === repository ? value : null;
    } catch { return null; }
  }

  function saveCache(value) {
    try { localStorage.setItem(storageKey, JSON.stringify(value)); } catch {}
  }

  function display(snapshot) {
    badge.textContent = '★ ' + (snapshot.count >= 1000
      ? (snapshot.count / 1000).toFixed(1) + 'k'
      : snapshot.count);
  }

  async function readJSON(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(url, { cache: 'no-cache', signal: controller.signal });
      if (!response.ok) throw new Error('GitHub stars unavailable');
      return await response.json();
    } finally { clearTimeout(timeout); }
  }

  async function refresh() {
    const cached = readCache();
    let snapshot = validSnapshot(cached) ? cached : null;
    let lastAttempt = Number.isFinite(cached?.attempted_at) ? cached.attempted_at : 0;
    if (snapshot) display(snapshot);

    try {
      const published = await readJSON('/meta/github-stars.json');
      if (validSnapshot(published)
          && (!snapshot || Date.parse(published.fetched_at) > Date.parse(snapshot.fetched_at))) {
        snapshot = { ...published, attempted_at: lastAttempt };
        saveCache(snapshot);
        display(snapshot);
      }
    } catch {}

    const now = Date.now();
    if (snapshot && now - Date.parse(snapshot.fetched_at) < refreshInterval) return;
    if (now - lastAttempt < refreshInterval) return;
    lastAttempt = now;
    saveCache({ ...snapshot, repository, attempted_at: lastAttempt });

    try {
      const data = await readJSON('https://api.github.com/repos/' + repository);
      const updated = {
        repository: data.full_name,
        count: data.stargazers_count,
        fetched_at: new Date(now).toISOString(),
        attempted_at: lastAttempt,
      };
      if (!validSnapshot(updated)) return;
      saveCache(updated);
      display(updated);
    } catch {}
  }

  refresh();
})();
