const nav = document.querySelector(".tn, .topnav");

if (nav) {
  const updateNavState = () => {
    nav.classList.toggle("scrolled", window.scrollY > 12);
  };

  updateNavState();
  window.addEventListener("scroll", updateNavState, { passive: true });
}

(() => {
  const menus = Array.from(document.querySelectorAll("[data-lang-menu]"));

  if (!menus.length) return;

  const setMenuState = (menu, open) => {
    menu.classList.toggle("open", open);
    const trigger = menu.querySelector(".lang-trigger");
    if (trigger) trigger.setAttribute("aria-expanded", open ? "true" : "false");
  };

  const closeMenus = (except) => {
    menus.forEach((menu) => {
      if (menu !== except) setMenuState(menu, false);
    });
  };

  menus.forEach((menu) => {
    const trigger = menu.querySelector(".lang-trigger");
    if (!trigger) return;

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const nextOpen = !menu.classList.contains("open");
      closeMenus(menu);
      setMenuState(menu, nextOpen);
    });
  });

  document.addEventListener("click", () => closeMenus());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenus();
  });
})();
