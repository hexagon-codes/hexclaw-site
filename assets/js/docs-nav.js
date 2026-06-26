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
    const items = Array.from(menu.querySelectorAll(".lang-menu-list a"));

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const nextOpen = !menu.classList.contains("open");
      closeMenus(menu);
      setMenuState(menu, nextOpen);
    });

    // role="menu" keyboard pattern: arrow keys / Home / End roving focus
    trigger.addEventListener("keydown", (event) => {
      if (!items.length) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        closeMenus(menu);
        setMenuState(menu, true);
        (event.key === "ArrowDown" ? items[0] : items[items.length - 1]).focus();
      }
    });
    menu.addEventListener("keydown", (event) => {
      if (!items.length) return;
      const i = items.indexOf(document.activeElement);
      if (event.key === "ArrowDown") { event.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (event.key === "ArrowUp") { event.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      else if (event.key === "Home") { event.preventDefault(); items[0].focus(); }
      else if (event.key === "End") { event.preventDefault(); items[items.length - 1].focus(); }
    });
  });

  document.addEventListener("click", () => closeMenus());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      const open = menus.find((m) => m.classList.contains("open"));
      if (open) { const t = open.querySelector(".lang-trigger"); if (t) t.focus(); }
      closeMenus();
    }
  });
})();

/* =====================================================================
   DOCS ENHANCEMENT LAYER
   Progressive upgrades built from the existing DOM — no per-page markup
   needed, so it applies uniformly across zh / en / ug (incl. RTL).
   ===================================================================== */
(() => {
  const main = document.querySelector("main.m");
  const isDocsPage = document.body.classList.contains("docs-page");
  const lang = (document.documentElement.getAttribute("lang") || "en").toLowerCase();
  const key = lang.startsWith("zh") ? "zh" : lang.startsWith("ug") ? "ug" : "en";

  const STR = {
    zh: { toc: "本页目录", copy: "复制", copied: "已复制", copyAria: "复制代码", anchor: "复制本节链接", docs: "文档", prev: "上一篇", next: "下一篇" },
    en: { toc: "On this page", copy: "Copy", copied: "Copied", copyAria: "Copy code", anchor: "Copy link to this section", docs: "Docs", prev: "Previous", next: "Next" },
    ug: { toc: "بەت مۇندەرىجىسى", copy: "كۆچۈرۈش", copied: "كۆچۈرۈلدى", copyAria: "كودنى كۆچۈرۈش", anchor: "بۇ بۆلەكنىڭ ئۇلانمىسىنى كۆچۈرۈش", docs: "ھۆججەتلەر", prev: "ئالدىنقى", next: "كېيىنكى" }
  }[key];

  const SVG_COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const SVG_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  /* ---- Reading progress bar (all pages) ---- */
  (() => {
    const bar = document.createElement("div");
    bar.className = "doc-progress";
    document.body.appendChild(bar);
    let ticking = false;
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      bar.style.width = (max > 0 ? Math.min(1, doc.scrollTop / max) * 100 : 0) + "%";
      ticking = false;
    };
    update();
    window.addEventListener("scroll", () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update, { passive: true });
  })();

  /* ---- Real copy buttons on code blocks ---- */
  (main || document).querySelectorAll(".m pre").forEach((pre) => {
    if (pre.querySelector(".code-copy")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "code-copy";
    btn.setAttribute("aria-label", STR.copyAria);
    btn.innerHTML = SVG_COPY + "<span>" + STR.copy + "</span>";
    const label = btn.querySelector("span");
    let timer = null;
    btn.addEventListener("click", async () => {
      const code = pre.querySelector("code");
      const text = (code ? code.innerText : pre.innerText).replace(/\n$/, "");
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const ta = document.createElement("textarea");
          ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
          document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
        }
        btn.classList.add("is-copied");
        btn.firstChild.outerHTML = SVG_OK;
        label.textContent = STR.copied;
        clearTimeout(timer);
        timer = setTimeout(() => {
          btn.classList.remove("is-copied");
          btn.firstChild.outerHTML = SVG_COPY;
          label.textContent = STR.copy;
        }, 1600);
      } catch (e) { /* clipboard blocked — no-op */ }
    });
    pre.appendChild(btn);
  });

  if (!main) return;

  /* ---- Heading ids + anchor links + TOC data ---- */
  const slugUsed = new Set();
  const slugify = (text, i) => {
    let s = text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!s) s = "sec-" + i;
    let out = s, n = 2;
    while (slugUsed.has(out)) out = s + "-" + n++;
    slugUsed.add(out);
    return out;
  };

  const headings = Array.from(main.querySelectorAll("h2, h3"));
  const tocItems = [];
  headings.forEach((h, i) => {
    if (!h.id) h.id = slugify(h.textContent || "", i + 1);
    else slugUsed.add(h.id);
    const a = document.createElement("a");
    a.className = "head-anchor";
    a.href = "#" + h.id;
    a.setAttribute("aria-label", STR.anchor);
    a.textContent = "#";
    h.appendChild(a);
    tocItems.push({ id: h.id, text: (h.textContent || "").replace(/#$/, "").trim(), level: h.tagName === "H3" ? 3 : 2 });
  });

  /* ---- Breadcrumb + TOC are scoped to real doc articles (have the .sb rail);
     about / terms / privacy / changelog share body.docs-page but must not get them. ---- */
  const lead = main.querySelector(".page-lead");
  const sidebar = document.querySelector("aside.sb");
  const isDocArticle = isDocsPage && !!sidebar;
  if (isDocArticle && lead) {
    const h1 = lead.querySelector("h1");
    const navDocs = document.querySelector(".tn a.is-active, .topnav-links a.is-active");
    const docsLabel = (navDocs && navDocs.textContent.trim()) || STR.docs;
    const docsHref = location.pathname.replace(/\/docs\/.*/, "/docs/");
    const crumb = document.createElement("nav");
    crumb.className = "doc-crumb";
    crumb.setAttribute("aria-label", "Breadcrumb");
    crumb.innerHTML =
      '<a href="' + docsHref + '">' + docsLabel + "</a>" +
      '<span class="doc-crumb-sep">' + (document.dir === "rtl" ? "‹" : "›") + "</span>" +
      '<span class="doc-crumb-current"></span>';
    crumb.querySelector(".doc-crumb-current").textContent = h1 ? h1.textContent.trim() : "";
    main.insertBefore(crumb, main.firstChild);
  }

  /* ---- Right-rail "On this page" TOC + scroll-spy ---- */
  let tocLinks = [];
  if (isDocArticle && tocItems.length >= 2) {
    const toc = document.createElement("aside");
    toc.className = "doc-toc";
    toc.setAttribute("aria-label", STR.toc);
    const title = document.createElement("div");
    title.className = "doc-toc-title";
    title.textContent = STR.toc;
    toc.appendChild(title);
    tocItems.forEach((it) => {
      const a = document.createElement("a");
      a.href = "#" + it.id;
      a.textContent = it.text;
      if (it.level === 3) a.classList.add("lv3");
      a.dataset.target = it.id;
      toc.appendChild(a);
    });
    document.body.appendChild(toc);
    tocLinks = Array.from(toc.querySelectorAll("a"));

    let spyTicking = false;
    const spy = () => {
      spyTicking = false;
      let activeId = tocItems[0].id;
      for (const it of tocItems) {
        const el = document.getElementById(it.id);
        if (el && el.getBoundingClientRect().top <= 120) activeId = it.id;
        else break;
      }
      tocLinks.forEach((a) => a.classList.toggle("is-active", a.dataset.target === activeId));
    };
    spy();
    window.addEventListener("scroll", () => {
      if (!spyTicking) { spyTicking = true; requestAnimationFrame(spy); }
    }, { passive: true });
  }

  /* ---- Prev / Next pager (derived from sidebar order) ---- */
  if (sidebar) {
    const links = Array.from(sidebar.querySelectorAll("a"));
    const idx = links.findIndex((a) => a.classList.contains("on"));
    if (idx !== -1) {
      const prev = links[idx - 1];
      const next = links[idx + 1];
      const card = (link, dir, dirLabel) => {
        const a = document.createElement("a");
        a.className = "doc-pager-link is-" + dir;
        a.href = link.getAttribute("href");
        a.innerHTML =
          '<span class="doc-pager-dir">' + dirLabel + "</span>" +
          '<span class="doc-pager-label"></span>';
        a.querySelector(".doc-pager-label").textContent = link.textContent.trim();
        return a;
      };
      const pager = document.createElement("nav");
      pager.className = "doc-pager";
      pager.setAttribute("aria-label", "Pagination");
      if (prev) pager.appendChild(card(prev, "prev", (document.dir === "rtl" ? "" : "← ") + STR.prev));
      if (next) pager.appendChild(card(next, "next", STR.next + (document.dir === "rtl" ? "" : " →")));

      if (prev || next) {
        // Replace the legacy inline bottom nav (uniform across all inner pages).
        const legacy = main.querySelector('div[style*="space-between"]');
        const editP = (() => {
          const e = main.querySelector('a[href*="/edit/"]');
          return e ? e.closest("p") : null;
        })();
        if (legacy) {
          const beforeHr = legacy.previousElementSibling;
          if (beforeHr && beforeHr.tagName === "HR") beforeHr.remove();
          legacy.replaceWith(pager);
        } else if (editP) {
          editP.parentNode.insertBefore(pager, editP);
        } else {
          main.appendChild(pager);
        }
      }
    }
  }
})();
