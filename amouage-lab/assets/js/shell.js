/* ==========================================================================
   6. SHELL — everything both pages share
   --------------------------------------------------------------------------
   · theme engine   (palette / serif / motion ⇄ localStorage ⇄ <html> attrs)
   · header         (transparent → solid, hide-on-scroll)
   · mega menu, mobile menu, search panel (keyboard + focus handling)
   · cart store     (localStorage) + right-hand drawer + toasts
   · <picture> helper used by the catalogue and PDP renderers
   · scroll reveal  (IntersectionObserver)
   Reference everything as window.SHELL.*
   ========================================================================== */
(function () {
  "use strict";

  const STORE = {
    palette: "lab.palette",
    serif: "lab.serif",
    motion: "lab.motion",
    cart: "lab.cart"
  };
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));

  /* ---------------------------------------------------------------- theme */
  const THEME = {
    palette: localStorage.getItem(STORE.palette) || "noir-or",
    serif: localStorage.getItem(STORE.serif) || "playfair",
    motion: localStorage.getItem(STORE.motion) || "moderate"
  };

  function applyTheme() {
    root.dataset.palette = THEME.palette;
    root.dataset.serif = THEME.serif;
    root.dataset.motion = THEME.motion;
    $$("[data-set-palette]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.setPalette === THEME.palette))
    );
    $$("[data-set-serif]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.setSerif === THEME.serif))
    );
    $$("[data-set-motion]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.setMotion === THEME.motion))
    );
  }

  function setTheme(key, value) {
    THEME[key] = value;
    localStorage.setItem(STORE[key], value);
    applyTheme();
  }

  function wireAtelier() {
    const toggle = $("[data-atelier-toggle]");
    const panel = $("[data-atelier-panel]");
    if (!toggle || !panel) return;

    toggle.addEventListener("click", () => {
      const open = panel.dataset.open === "true";
      panel.dataset.open = String(!open);
      toggle.setAttribute("aria-expanded", String(!open));
    });

    $$("[data-set-palette]").forEach((b) =>
      b.addEventListener("click", () => setTheme("palette", b.dataset.setPalette))
    );
    $$("[data-set-serif]").forEach((b) =>
      b.addEventListener("click", () => setTheme("serif", b.dataset.setSerif))
    );
    $$("[data-set-motion]").forEach((b) =>
      b.addEventListener("click", () => setTheme("motion", b.dataset.setMotion))
    );

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && panel.dataset.open === "true") {
        panel.dataset.open = "false";
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  /* ------------------------------------------------------------- pictures */
  /**
   * Builds a <picture> with AVIF + WebP and a single rendered width.
   * `set` is the base path from catalog-data.js (…/derived/pf020/card-800).
   */
  function picture(set, { alt = "", width = 800, height = 1000, className = "" } = {}) {
    const el = document.createElement("picture");
    const avif = document.createElement("source");
    avif.type = "image/avif";
    avif.srcset = `${set}.avif`;
    const webp = document.createElement("source");
    webp.type = "image/webp";
    webp.srcset = `${set}.webp`;
    const img = document.createElement("img");
    img.src = `${set}.webp`;
    img.alt = alt;
    img.width = width;
    img.height = height;
    img.loading = "lazy";
    img.decoding = "async";
    if (className) img.className = className;
    el.append(avif, webp, img);
    return el;
  }

  /* ------------------------------------------------------ focus utilities */
  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function trapFocus(container) {
    const items = $$(FOCUSABLE, container).filter((el) => el.offsetParent !== null);
    if (!items.length) return () => {};
    const first = items[0];
    const last = items[items.length - 1];
    const onKey = (e) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    container.addEventListener("keydown", onKey);
    first.focus();
    return () => container.removeEventListener("keydown", onKey);
  }

  /* ---------------------------------------------------------- overlays */
  function makeOverlay(el, { onOpen, onClose } = {}) {
    let restoreFocus = null;
    let releaseTrap = null;

    const api = {
      get isOpen() {
        return el.dataset.open === "true";
      },
      open(trigger) {
        if (api.isOpen) return;
        restoreFocus = trigger || document.activeElement;
        el.dataset.open = "true";
        el.removeAttribute("aria-hidden");
        releaseTrap = trapFocus(el);
        document.body.style.overflow = "hidden";
        onOpen?.(el);
      },
      close() {
        if (!api.isOpen) return;
        el.dataset.open = "false";
        releaseTrap?.();
        releaseTrap = null;
        document.body.style.overflow = "";
        onClose?.(el);
        restoreFocus?.focus?.();
      },
      toggle(trigger) {
        api.isOpen ? api.close() : api.open(trigger);
      }
    };

    el.addEventListener("keydown", (e) => {
      if (e.key === "Escape") api.close();
    });
    return api;
  }

  /* -------------------------------------------------------------- header */
  function wireHeader() {
    const header = $(".site-header");
    const subnav = $(".subnav");
    if (!header) return;
    let lastY = window.scrollY;

    const onScroll = () => {
      const y = Math.max(window.scrollY, 0);

      // The announcement bar scrolls away; the fixed bars follow it up so the
      // header never covers it on first paint.
      const announce = $(".announce");
      const offset = announce ? Math.max(0, announce.offsetHeight - y) : 0;
      root.style.setProperty("--stack-offset", `${offset}px`);

      const solid = y > 40;
      header.dataset.state = solid ? "solid" : "transparent";

      // Hide on downward scroll, return on upward — desktop only, never while
      // a menu is open (the CSS ignores the flag under 900px).
      const goingDown = y > lastY + 6;
      const goingUp = y < lastY - 6;
      const menuOpen = $("[data-menu-open='true']") !== null;
      if (goingDown && y > 220 && !menuOpen) header.dataset.hidden = "true";
      if (goingUp || y <= 220 || menuOpen) header.dataset.hidden = "false";
      if (subnav) subnav.dataset.hidden = header.dataset.hidden;

      lastY = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // Near the top of the viewport the bar always returns, even without a scroll.
    window.addEventListener("pointermove", (e) => {
      if (e.clientY <= 20) {
        header.dataset.hidden = "false";
        if (subnav) subnav.dataset.hidden = "false";
      }
    });
  }

  /* ----------------------------------------------------------- mega menu */
  function wireMega() {
    const trigger = $("[data-mega-trigger]");
    const mega = $("[data-mega]");
    if (!trigger || !mega) return;

    let closeTimer = null;

    const open = () => {
      clearTimeout(closeTimer);
      mega.dataset.open = "true";
      trigger.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    };
    const close = (returnFocus) => {
      mega.dataset.open = "false";
      trigger.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      if (returnFocus) trigger.focus();
    };

    trigger.addEventListener("click", () =>
      mega.dataset.open === "true" ? close(true) : open()
    );
    // Hover intent: 120ms grace so the pointer can cross the gap.
    [trigger, mega].forEach((el) => {
      el.addEventListener("pointerenter", () => {
        if (window.matchMedia("(hover: hover)").matches) open();
      });
      el.addEventListener("pointerleave", () => {
        if (window.matchMedia("(hover: hover)").matches) {
          closeTimer = setTimeout(() => close(false), 120);
        }
      });
    });
    mega.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close(true);
    });
    document.addEventListener("click", (e) => {
      if (mega.dataset.open !== "true") return;
      if (mega.contains(e.target) || trigger.contains(e.target)) return;
      close(false);
    });
  }

  /* ------------------------------------------------------------ cart store */
  const CART = {
    read() {
      try {
        const raw = JSON.parse(localStorage.getItem(STORE.cart) || "[]");
        return Array.isArray(raw) ? raw : [];
      } catch {
        return [];
      }
    },
    write(lines) {
      localStorage.setItem(STORE.cart, JSON.stringify(lines));
      document.dispatchEvent(new CustomEvent("cart:change"));
    },
    add(product, size) {
      const lines = CART.read();
      const key = `${product.slug}::${size.label}`;
      const found = lines.find((l) => l.key === key);
      if (found) found.qty += 1;
      else
        lines.push({
          key,
          slug: product.slug,
          name: product.name,
          size: size.label,
          price: size.price,
          qty: 1
        });
      CART.write(lines);
    },
    remove(key) {
      CART.write(CART.read().filter((l) => l.key !== key));
    },
    setQty(key, qty) {
      const lines = CART.read();
      const line = lines.find((l) => l.key === key);
      if (!line) return;
      line.qty = Math.max(1, Math.min(9, qty));
      CART.write(lines);
    },
    count() {
      return CART.read().reduce((n, l) => n + l.qty, 0);
    },
    subtotal() {
      return CART.read().reduce((n, l) => n + l.price * l.qty, 0);
    }
  };

  /* ---------------------------------------------------------------- toasts */
  function toast(message) {
    let stack = $(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      stack.setAttribute("role", "status");
      stack.setAttribute("aria-live", "polite");
      document.body.append(stack);
    }
    const el = document.createElement("p");
    el.className = "toast";
    el.textContent = message;
    stack.append(el);
    setTimeout(() => {
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 400);
    }, 2400);
  }

  /* --------------------------------------------------------- cart drawer */
  function wireCart() {
    const drawer = $("[data-cart-drawer]");
    const overlay = $("[data-overlay]");
    if (!drawer || !overlay) return;

    const body = $("[data-cart-body]", drawer);
    const totalEl = $("[data-cart-total]", drawer);
    const badge = $("[data-cart-count]");

    const drawerApi = makeOverlay(drawer, { onClose: () => (overlay.dataset.open = "false") });

    const openWith = (trigger) => {
      overlay.dataset.open = "true";
      drawerApi.open(trigger);
    };

    const closeAll = () => {
      overlay.dataset.open = "false";
      drawerApi.close();
    };

    overlay.addEventListener("click", closeAll);
    $$("[data-cart-open]").forEach((b) =>
      b.addEventListener("click", () => openWith(b))
    );
    $$("[data-cart-close]").forEach((b) => b.addEventListener("click", closeAll));

    function render() {
      const lines = CART.read();
      badge.textContent = String(CART.count());
      badge.hidden = CART.count() === 0;

      if (!lines.length) {
        body.innerHTML = `
          <div class="drawer-empty">
            <p class="serif" style="font-size:var(--fs-lg)">Your selection is empty</p>
            <p>Every composition begins with a first spray. Explore the collection to find yours.</p>
            <a class="btn btn--secondary btn--sm" href="index.html">Browse perfumes</a>
          </div>`;
      } else {
        body.innerHTML = lines
          .map(
            (l) => `
          <article class="cart-line">
            <div class="cart-line__img">
              <picture>
                <source type="image/avif" srcset="/public/products/derived/${l.slug}/card-400.avif">
                <source type="image/webp" srcset="/public/products/derived/${l.slug}/card-400.webp">
                <img src="/public/products/derived/${l.slug}/card-400.webp" alt="" width="72" height="90" loading="lazy">
              </picture>
            </div>
            <div>
              <p class="cart-line__name">${l.name}</p>
              <p class="cart-line__meta">${l.size}</p>
              <div class="qty">
                <button type="button" data-qty="-1" data-key="${l.key}" aria-label="Decrease quantity of ${l.name}, ${l.size}">−</button>
                <span aria-live="polite">${l.qty}</span>
                <button type="button" data-qty="1" data-key="${l.key}" aria-label="Increase quantity of ${l.name}, ${l.size}">+</button>
              </div>
            </div>
            <div style="display:grid;gap:var(--sp-2);justify-items:end">
              <p class="cart-line__price">${LAB.currency(l.price * l.qty)}</p>
              <button type="button" class="link-underline" data-remove="${l.key}" style="font-size:var(--fs-3xs);letter-spacing:var(--ls-label);text-transform:uppercase;color:var(--c-ink-muted)">Remove</button>
            </div>
          </article>`
          )
          .join("");

        body.querySelectorAll("[data-qty]").forEach((b) =>
          b.addEventListener("click", () => {
            const key = b.dataset.key;
            const line = CART.read().find((l) => l.key === key);
            if (!line) return;
            CART.setQty(key, line.qty + Number(b.dataset.qty));
          })
        );
        body.querySelectorAll("[data-remove]").forEach((b) =>
          b.addEventListener("click", () => {
            CART.remove(b.dataset.remove);
            toast("Removed from your selection");
          })
        );
      }
      totalEl.textContent = LAB.currency(CART.subtotal());
    }

    document.addEventListener("cart:change", render);
    render();

    return { openWith, closeAll };
  }

  /* ------------------------------------------------------- mobile menu */
  function wireMobileMenu() {
    const menu = $("[data-mobile-menu]");
    if (!menu) return;
    const api = makeOverlay(menu);
    $$("[data-menu-toggle]").forEach((b) =>
      b.addEventListener("click", () => api.toggle(b))
    );
    $$("[data-menu-close]").forEach((b) => b.addEventListener("click", () => api.close()));

    // Accordion within the sheet
    $$("[data-mobile-group]", menu).forEach((trigger) => {
      const panel = trigger.nextElementSibling;
      trigger.addEventListener("click", () => {
        const open = trigger.getAttribute("aria-expanded") === "true";
        trigger.setAttribute("aria-expanded", String(!open));
        panel.dataset.open = String(!open);
      });
    });
  }

  /* ------------------------------------------------------------ search */
  function wireSearch() {
    const panel = $("[data-search-panel]");
    if (!panel) return;
    const api = makeOverlay(panel);
    const input = $("input[type='search']", panel);
    $$("[data-search-open]").forEach((b) =>
      b.addEventListener("click", () => {
        api.open(b);
        input?.focus();
      })
    );
    $$("[data-search-close]").forEach((b) => b.addEventListener("click", () => api.close()));

    // A real store would POST here; the lab sends you to the collection with ?q=
    $("form", panel)?.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = input.value.trim();
      window.location.href = `index.html${q ? `?q=${encodeURIComponent(q)}` : ""}`;
    });
  }

  /* ------------------------------------------------------ scroll reveal */
  function wireReveal() {
    const nodes = $$(".reveal");
    if (!nodes.length) return;
    if (reduceMotion.matches || THEME.motion === "none" || !("IntersectionObserver" in window)) {
      nodes.forEach((n) => n.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    nodes.forEach((n, i) => {
      if (!n.style.getPropertyValue("--reveal-delay")) {
        n.style.setProperty("--reveal-delay", `${(i % 4) * 70}ms`);
      }
      io.observe(n);
    });
  }

  /* ---------------------------------------------------------------- boot */
  applyTheme();
  document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("is-ready");
    wireAtelier();
    wireHeader();
    wireMega();
    wireCart();
    wireMobileMenu();
    wireSearch();
    wireReveal();
    $$("[data-search-suggestion]").forEach((b) =>
      b.addEventListener("click", () => {
        window.location.href = `index.html?q=${encodeURIComponent(b.dataset.searchSuggestion)}`;
      })
    );
  });

  window.SHELL = { THEME, setTheme, picture, toast, CART, makeOverlay, trapFocus, reduceMotion };
})();
