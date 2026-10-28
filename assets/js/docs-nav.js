const nav = document.querySelector(".tn, .topnav");

// 文档切页保留当前标签页的侧栏位置，避免点击底部导航后回到列表顶部。
(() => {
  const sidebar = document.querySelector(".sb");
  if (!sidebar) return;
  const desktop = window.matchMedia("(min-width: 769px)");
  const storageKey = "hexclaw-doc-sidebar-scroll:" + document.documentElement.lang;
  const restore = () => {
    if (!desktop.matches) return;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved !== null && Number.isFinite(Number(saved))) {
        sidebar.scrollTop = Math.max(0, Number(saved));
      }
    } catch {}
  };
  const save = () => {
    if (!desktop.matches) return;
    try { sessionStorage.setItem(storageKey, String(sidebar.scrollTop)); } catch {}
  };
  restore();
  sidebar.addEventListener("scroll", save, { passive: true });
  sidebar.addEventListener("click", (event) => {
    if (event.target.closest("a")) save();
  });
  window.addEventListener("pagehide", save);
  window.addEventListener("pageshow", (event) => { if (event.persisted) restore(); });
  desktop.addEventListener("change", (event) => { if (event.matches) restore(); });
})();

// 导航星标读取桌面端仓库的公开计数，网络失败时保留星形标记。
(() => {
  const badge = document.getElementById("gh-stars");
  if (!badge) return;
  fetch("https://api.github.com/repos/hexagon-codes/hexclaw-desktop")
    .then((response) => {
      if (!response.ok) throw new Error("GitHub stars unavailable");
      return response.json();
    })
    .then((data) => {
      const count = data.stargazers_count;
      if (Number.isInteger(count) && count >= 0) {
        badge.textContent = "★ " + (count >= 1000 ? (count / 1000).toFixed(1) + "k" : count);
      }
    })
    .catch(() => {});
})();

// 横向文档导航优先露出当前页面，章节多时仍可左右滚动。
const mobileDocNav = document.querySelector(".mobile-doc-nav");
const currentDocLink = mobileDocNav?.querySelector("a.on");
if (currentDocLink && window.matchMedia("(max-width: 768px)").matches) {
  const container = mobileDocNav.getBoundingClientRect();
  const current = currentDocLink.getBoundingClientRect();
  mobileDocNav.scrollLeft += current.left - container.left - (container.width - current.width) / 2;
}

if (nav) {
  const updateNavState = () => {
    nav.classList.toggle("scrolled", window.scrollY > 12);
  };

  updateNavState();
  window.addEventListener("scroll", updateNavState, { passive: true });
}

(() => {
  const button = document.querySelector(".tn-burger, .topnav-burger");
  if (!button) return;
  const controlledId = button.getAttribute("aria-controls");
  const links = controlledId ? document.getElementById(controlledId) : null;
  if (!links) return;

  // 维语内页菜单更宽，展开状态与其专属折叠断点保持一致。
  const desktop = window.matchMedia(document.documentElement.lang.startsWith("ug")
    ? "(min-width: 1280px)"
    : "(min-width: 1101px)");
  const setOpen = (open) => {
    links.classList.toggle("open", open);
    button.setAttribute("aria-expanded", open ? "true" : "false");
  };

  button.addEventListener("click", () => setOpen(!links.classList.contains("open")));
  links.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && links.classList.contains("open")) {
      setOpen(false);
      button.focus();
    }
  });
  desktop.addEventListener("change", (event) => {
    if (event.matches) setOpen(false);
  });
})();

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
    zh: { toc: "本页目录", copy: "复制", copied: "已复制", copyAria: "复制代码", copyFailed: "无法自动复制，已选中代码，请手动复制。", anchor: "本节链接", docs: "文档", prev: "上一篇", next: "下一篇", collapseSidebar: "收起侧栏", expandSidebar: "展开侧栏", backToTop: "返回顶部", top: "顶部" },
    en: { toc: "On this page", copy: "Copy", copied: "Copied", copyAria: "Copy code", copyFailed: "Automatic copy is unavailable. The code is selected; copy it manually.", anchor: "Link to this section", docs: "Docs", prev: "Previous", next: "Next", collapseSidebar: "Collapse sidebar", expandSidebar: "Expand sidebar", backToTop: "Back to top", top: "Top" },
    ug: { toc: "بەت مۇندەرىجىسى", copy: "كۆچۈرۈش", copied: "كۆچۈرۈلدى", copyAria: "كودنى كۆچۈرۈش", copyFailed: "ئاپتوماتىك كۆچۈرگىلى بولمىدى؛ كود تاللاندى، قولدا كۆچۈرۈڭ.", anchor: "بۇ بۆلەكنىڭ ئۇلانمىسى", docs: "ھۆججەتلەر", prev: "ئالدىنقى", next: "كېيىنكى", collapseSidebar: "يان بالداقنى قاتلاش", expandSidebar: "يان بالداقنى كېڭەيتىش", backToTop: "چوققىغا قايتىش", top: "چوققا" }
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
  (main || document).querySelectorAll(".m pre").forEach((pre, index) => {
    if (pre.querySelector(".code-copy")) return;
    const code = pre.querySelector("code");
    const sourceText = (code ? code.textContent : pre.textContent).replace(/\n$/, "");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "code-copy";
    btn.setAttribute("aria-label", STR.copyAria);
    btn.innerHTML = SVG_COPY + "<span>" + STR.copy + "</span>";
    const label = btn.querySelector("span");
    const status = document.createElement("span");
    status.className = "code-copy-status";
    status.id = "code-copy-status-" + index;
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    btn.setAttribute("aria-describedby", status.id);
    let timer = null;
    let pending = false;
    btn.addEventListener("click", async () => {
      if (pending) return;
      pending = true;
      btn.setAttribute("aria-busy", "true");
      status.classList.remove("is-error");
      status.textContent = "";
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(sourceText);
        } else {
          const ta = document.createElement("textarea");
          ta.value = sourceText; ta.style.position = "fixed"; ta.style.opacity = "0";
          document.body.appendChild(ta); ta.select();
          try {
            if (!document.execCommand("copy")) throw new Error("Clipboard unavailable");
          } finally { ta.remove(); }
        }
        btn.classList.add("is-copied");
        btn.firstChild.outerHTML = SVG_OK;
        label.textContent = STR.copied;
        status.textContent = STR.copied;
        clearTimeout(timer);
        timer = setTimeout(() => {
          btn.classList.remove("is-copied");
          btn.firstChild.outerHTML = SVG_COPY;
          label.textContent = STR.copy;
        }, 1600);
      } catch {
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          range.selectNodeContents(code || pre);
          if (!code) range.setEndBefore(btn);
          selection.removeAllRanges(); selection.addRange(range);
        }
        status.classList.add("is-error");
        status.textContent = STR.copyFailed;
      } finally {
        pending = false;
        btn.removeAttribute("aria-busy");
      }
    });
    pre.append(btn, status);
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
    const docsHref = (navDocs && navDocs.getAttribute("href")) || location.pathname.replace(/\/docs\/.*/, "/docs/");
    const crumb = document.createElement("nav");
    crumb.className = "doc-crumb";
    crumb.setAttribute("aria-label", "Breadcrumb");
    crumb.innerHTML =
      '<a href="' + docsHref + '">' + docsLabel + "</a>" +
      '<span class="doc-crumb-sep">' + (document.dir === "rtl" ? "‹" : "›") + "</span>" +
      '<span class="doc-crumb-current"></span>';
    const currentLink = sidebar.querySelector("a.on");
    crumb.querySelector(".doc-crumb-current").textContent = currentLink ? currentLink.textContent.trim() : h1 ? h1.textContent.trim() : "";
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

    // 窄屏将同一组章节放在正文前，目录内容不再维护两份。
    const inlineToc = document.createElement("details");
    inlineToc.className = "doc-toc-inline";
    const summary = document.createElement("summary");
    summary.textContent = STR.toc;
    inlineToc.appendChild(summary);
    tocLinks.forEach((link) => inlineToc.appendChild(link.cloneNode(true)));
    if (lead) lead.after(inlineToc);

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

  /* ---- Collapsible Left Sidebar (Zen / Focus Mode) ---- */
  if (sidebar) {
    const desktop = window.matchMedia("(min-width: 769px)");
    const collapseKey = "hexclaw-doc-sidebar-collapsed";

    const sbTitle = sidebar.querySelector(".sb-t");
    const collapseBtn = document.createElement("button");
    collapseBtn.type = "button";
    collapseBtn.className = "sb-collapse-btn";
    collapseBtn.setAttribute("aria-label", STR.collapseSidebar);
    collapseBtn.setAttribute("title", STR.collapseSidebar + " ([)");
    collapseBtn.innerHTML =
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/></svg>';

    if (sbTitle) {
      const sbHeader = document.createElement("div");
      sbHeader.className = "sb-header";
      sbTitle.parentNode.insertBefore(sbHeader, sbTitle);
      sbHeader.appendChild(sbTitle);
      sbHeader.appendChild(collapseBtn);
    } else {
      sidebar.insertBefore(collapseBtn, sidebar.firstChild);
    }

    const expandBtn = document.createElement("button");
    expandBtn.type = "button";
    expandBtn.className = "sb-expand-btn";
    expandBtn.setAttribute("aria-label", STR.expandSidebar);
    expandBtn.setAttribute("title", STR.expandSidebar + " ([)");
    expandBtn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
    document.body.appendChild(expandBtn);

    const setCollapsed = (collapsed, save = true) => {
      document.body.classList.toggle("sb-collapsed", collapsed);
      collapseBtn.setAttribute("aria-expanded", (!collapsed).toString());
      expandBtn.setAttribute("aria-expanded", (!collapsed).toString());
      if (save) {
        try { localStorage.setItem(collapseKey, collapsed ? "1" : "0"); } catch {}
      }
    };

    try {
      if (desktop.matches && localStorage.getItem(collapseKey) === "1") {
        setCollapsed(true, false);
      }
    } catch {}

    collapseBtn.addEventListener("click", () => setCollapsed(true));
    expandBtn.addEventListener("click", () => setCollapsed(false));

    document.addEventListener("keydown", (event) => {
      if (!desktop.matches) return;
      if (event.key === "[" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const tag = (document.activeElement?.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable) return;
        event.preventDefault();
        setCollapsed(!document.body.classList.contains("sb-collapsed"));
      } else if ((event.key === "b" || event.key === "B") && (event.metaKey || event.ctrlKey) && !event.altKey) {
        event.preventDefault();
        setCollapsed(!document.body.classList.contains("sb-collapsed"));
      }
    });

    desktop.addEventListener("change", (e) => {
      if (!e.matches) setCollapsed(false, false);
    });
  }

  // 统一浮动返回顶部按钮（与技术博客页视觉一致，支持深浅色与平滑滚动）
  (() => {
    let btn = document.getElementById("backToTop");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "back-to-top";
      btn.id = "backToTop";
      btn.setAttribute("aria-label", STR.backToTop || "返回顶部");
      btn.setAttribute("title", STR.backToTop || "返回顶部");
      btn.innerHTML =
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>' +
        `<span>${STR.top || "顶部"}</span>`;
      document.body.appendChild(btn);
    }
    let ticking = false;
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            if (window.scrollY > 320) {
              btn.classList.add("is-visible");
            } else {
              btn.classList.remove("is-visible");
            }
            ticking = false;
          });
          ticking = true;
        }
      },
      { passive: true }
    );
    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  })();
})();
