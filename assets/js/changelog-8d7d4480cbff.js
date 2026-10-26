(() => {
  const backToTop = document.querySelector('[data-back-to-top]');
  if (!backToTop) return;

  // 首屏保持阅读区简洁，恢复滚动位置或改变窗口尺寸时同步入口。
  const updateVisibility = () => {
    backToTop.hidden = window.scrollY < window.innerHeight;
  };

  window.addEventListener('scroll', updateVisibility, { passive: true });
  window.addEventListener('resize', updateVisibility);
  window.addEventListener('pageshow', updateVisibility);
  updateVisibility();
})();
