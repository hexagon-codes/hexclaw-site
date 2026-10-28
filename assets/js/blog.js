// 博客目录与文章页共用阅读操作，页面不再各自复制初始化逻辑。
(function () {
  const button = document.getElementById('backToTop');
  if (button) {
    let ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      window.requestAnimationFrame(function () {
        button.classList.toggle('is-visible', window.scrollY > 320);
        ticking = false;
      });
      ticking = true;
    }, { passive: true });
    button.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  const buttons = document.querySelectorAll('.blog-filter-btn');
  const cards = document.querySelectorAll('.blog-row');
  buttons.forEach(function (filterButton) {
    filterButton.addEventListener('click', function () {
      buttons.forEach(function (item) {
        item.classList.remove('is-active');
        item.setAttribute('aria-selected', 'false');
      });
      filterButton.classList.add('is-active');
      filterButton.setAttribute('aria-selected', 'true');
      const filter = filterButton.getAttribute('data-filter');
      cards.forEach(function (card) {
        card.style.display = filter === 'all' || card.getAttribute('data-category') === filter ? 'flex' : 'none';
      });
    });
  });
})();
