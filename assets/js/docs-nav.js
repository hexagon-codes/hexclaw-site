const nav = document.querySelector(".tn, .topnav");

if (nav) {
  const updateNavState = () => {
    nav.classList.toggle("scrolled", window.scrollY > 12);
  };

  updateNavState();
  window.addEventListener("scroll", updateNavState, { passive: true });
}
