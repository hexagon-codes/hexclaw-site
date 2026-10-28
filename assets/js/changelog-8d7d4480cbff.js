(() => {
  // 1. Back to top button
  const backToTop = document.querySelector('[data-back-to-top]');
  if (backToTop) {
    const updateVisibility = () => {
      backToTop.hidden = window.scrollY < window.innerHeight;
    };
    window.addEventListener('scroll', updateVisibility, { passive: true });
    window.addEventListener('resize', updateVisibility);
    window.addEventListener('pageshow', updateVisibility);
    updateVisibility();
  }

  // 2. Changelog Toolbar & Category Filtering
  const filterTabs = document.querySelectorAll('.filter-tab');
  const releases = document.querySelectorAll('.release');
  const milestoneDividers = document.querySelectorAll('.milestone-divider');
  const milestoneChips = document.querySelectorAll('.milestone-chip');
  const quickDownload = document.querySelector('[data-toolbar-download]');
  const toast = document.getElementById('changelog-toast');

  let activeCategory = 'all';

  const applyCategoryFilter = () => {
    releases.forEach((rel) => {
      const items = rel.querySelectorAll('.release-notes > li');
      let visibleCount = 0;

      items.forEach((item) => {
        const itemType = item.dataset.type || '';
        const matches = activeCategory === 'all' || itemType === activeCategory;
        item.classList.toggle('is-hidden', !matches);
        if (matches) visibleCount++;
      });

      rel.classList.toggle('is-hidden', visibleCount === 0);
    });

    // Toggle milestone dividers based on whether any release in its group is visible
    milestoneDividers.forEach((div) => {
      let nextElem = div.nextElementSibling;
      let hasVisible = false;
      while (nextElem && !nextElem.classList.contains('milestone-divider')) {
        if (nextElem.classList.contains('release') && !nextElem.classList.contains('is-hidden')) {
          hasVisible = true;
          break;
        }
        nextElem = nextElem.nextElementSibling;
      }
      div.classList.toggle('is-hidden', !hasVisible);
    });
  };

  if (filterTabs.length > 0) {
    filterTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        activeCategory = tab.dataset.filter || 'all';
        filterTabs.forEach((t) => t.classList.toggle('is-active', t === tab));
        applyCategoryFilter();
      });
    });
  }

  // 3. Milestone active indicator on scroll & Quick Download reveal
  if (milestoneDividers.length > 0 || quickDownload) {
    const onScroll = () => {
      const scrollY = window.scrollY;

      // Reveal sticky download button after scrolling past hero lead
      if (quickDownload) {
        quickDownload.classList.toggle('is-visible', scrollY > 260);
      }

      // Track active milestone chip
      if (milestoneDividers.length > 0 && milestoneChips.length > 0) {
        const scrollPos = scrollY + 160;
        let activeId = '';

        milestoneDividers.forEach((div) => {
          if (!div.classList.contains('is-hidden') && div.offsetTop <= scrollPos) {
            activeId = div.id;
          }
        });

        if (activeId) {
          milestoneChips.forEach((chip) => {
            const href = chip.getAttribute('href');
            const isActive = href === `#${activeId}`;
            chip.classList.toggle('is-active', isActive);

            // If active and chip container has horizontal scroll, gently keep in view
            if (isActive && chip.parentElement) {
              const container = chip.parentElement;
              const chipLeft = chip.offsetLeft;
              const chipWidth = chip.offsetWidth;
              const containerWidth = container.clientWidth;
              const scrollLeft = container.scrollLeft;

              if (chipLeft < scrollLeft || chipLeft + chipWidth > scrollLeft + containerWidth) {
                container.scrollTo({
                  left: chipLeft - (containerWidth / 2) + (chipWidth / 2),
                  behavior: 'smooth'
                });
              }
            }
          });
        }
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // 4. Version 1-click Permalink Copy with Micro-Toast
  let toastTimer = null;
  const showToast = (msg) => {
    if (!toast) return;
    toast.textContent = msg || '已复制版本链接到剪贴板';
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 2200);
  };

  document.querySelectorAll('.release-anchor').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const href = anchor.getAttribute('href');
      const url = `${window.location.origin}${window.location.pathname}${href}`;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
          showToast(`已复制 ${href} 版本链接`);
        }).catch(() => {
          window.location.hash = href;
        });
      } else {
        window.location.hash = href;
      }
    });
  });
})();
