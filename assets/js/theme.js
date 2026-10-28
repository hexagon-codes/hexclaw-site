// 首页、文档与博客共用主题状态，现有按钮统一调用 toggleTheme。
(function () {
  const storageKey = 'hexclaw-theme';
  const applyTheme = (theme) => document.documentElement.setAttribute('data-theme', theme);

  window.toggleTheme = function () {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
    try { localStorage.setItem(storageKey, theme); } catch {}
  };

  let saved;
  try { saved = localStorage.getItem(storageKey); } catch {}
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved === 'dark' || (!saved && prefersDark) ? 'dark' : 'light');
})();
