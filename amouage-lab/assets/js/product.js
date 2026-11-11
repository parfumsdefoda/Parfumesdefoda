/* ==========================================================================
   8. PRODUCT DETAIL LOGIC
   --------------------------------------------------------------------------
   Renders one product from ?slug= into the PDP skeleton, then wires:
   gallery (thumbnails, hover zoom, swipe), size variants, wishlist,
   accordions, gift personalisation with a live engraving preview, the related
   rail and the mobile purchase bar.
   ========================================================================== */
(function () {
  "use strict";

  const $ = (s, scope = document) => scope.querySelector(s);
  const $$ = (s, scope = document) => Array.from(scope.querySelectorAll(s));
  const { catalog, bySlug, currency, imageSet } = window.LAB;
  const params = new URLSearchParams(window.location.search);
  const product = bySlug(params.get("slug") || catalog[0].slug);

  const state = {
    size: product.sizes.find((s) => !s.soldOut) || product.sizes[0],
    engraving: "",
    engravingStyle: "classic",
    engravingColor: "gold",
    wrap: "noir",
    confirmed: false,
    wished: false
  };

  /* ------------------------------------------------------------- markup */
  function renderInfo() {
    document.title = `${product.name} — Parfums De Foda Atelier`;

    $("[data-pdp-crumb]").innerHTML =
      `<a href="index.html">Perfumes</a> / <a href="index.html?family=${product.family}">${product.family}</a> / ${product.name}`;
    const coll = $("[data-pdp-collection]");
    if (coll) coll.textContent = `${product.collection} · ${product.family}`;
    $("[data-pdp-name]").textContent = product.name;
    $("[data-pdp-sub]").textContent = `${product.collection} collection · ${product.gender} · Eau de Parfum`;

    renderPrice();
    renderVariants();
    renderNotes();

    $("[data-pdp-description]").textContent = product.description;
    $("[data-pdp-ingredients]").textContent = product.ingredients;
    $("[data-pdp-shipping]").textContent =
      "Shipped in 24 hours from the atelier. Complimentary delivery over $250, express options at checkout. Unopened bottles may be returned within 30 days; engraved bottles are final sale.";

    // Structured data, mirrored from the same object the UI renders.
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.description,
      brand: { "@type": "Brand", name: "Parfums De Foda" },
      category: product.family,
      image: [`${product.image.base}/pdp-1200.webp`],
      offers: {
        "@type": "Offer",
        priceCurrency: "USD",
        price: product.price,
        availability: product.soldOut
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock"
      },
      additionalProperty: [
        { "@type": "PropertyValue", name: "Collection", value: product.collection },
        { "@type": "PropertyValue", name: "Gender", value: product.gender }
      ]
    });
    document.head.append(ld);
  }

  function renderPrice() {
    $("[data-pdp-price]").innerHTML = `${currency(state.size.price)} <small>${state.size.label}</small>`;
    const buy = $("[data-add-to-cart]");
    const soldOut = product.soldOut || state.size.soldOut;
    // An engraving only blocks the purchase until its wording is confirmed.
    const needsConfirm = state.engraving.trim().length > 0 && !state.confirmed;
    buy.disabled = soldOut || needsConfirm;
    buy.textContent = soldOut ? "Out of stock" : "Add to selection";
    const note = $("[data-stock-note]");
    note.dataset.state = soldOut ? "out" : "in";
    note.textContent = soldOut
      ? "This size is currently out of stock"
      : state.engraving && !state.confirmed
        ? "Confirm the engraving wording to continue"
        : "In stock · despatched within 24 hours";
    const barPrice = $("[data-buy-bar-price]");
    if (barPrice) barPrice.textContent = currency(state.size.price);
  }

  function renderVariants() {
    const host = $("[data-variants]");
    host.innerHTML = "";
    product.sizes.forEach((size) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "variant";
      btn.textContent = size.label;
      btn.disabled = size.soldOut;
      btn.setAttribute("aria-pressed", String(size.label === state.size.label));
      btn.setAttribute(
        "aria-label",
        `${size.label}, ${currency(size.price)}${size.soldOut ? ", out of stock" : ""}`
      );
      btn.addEventListener("click", () => {
        state.size = size;
        $$(".variant", host).forEach((b) =>
          b.setAttribute("aria-pressed", String(b.textContent === size.label))
        );
        renderPrice();
      });
      host.append(btn);
    });
  }

  function renderNotes() {
    const host = $("[data-notes]");
    const rows = [
      ["Top", product.notes.top],
      ["Heart", product.notes.heart],
      ["Base", product.notes.base]
    ];
    host.innerHTML = rows
      .map(([label, notes]) => `<div><dt>${label}</dt><dd>${notes.join(" · ")}</dd></div>`)
      .join("");
  }

  /* ------------------------------------------------------------ gallery */
  function renderGallery() {
    const stage = $("[data-gallery-stage]");
    const thumbs = $("[data-thumbs]");

    // Three framings of the same bottle: full, closer, and the warm stage.
    // A production PDP swaps these for real multi-angle photography.
    const slides = [
      { set: imageSet(product, "pdp-1200").path, label: "Full bottle", warm: false, scale: 1 },
      { set: imageSet(product, "card-800").path, label: "Closer look", warm: false, scale: 1 },
      { set: imageSet(product, "pdp-1200").path, label: "Warm light", warm: true, scale: 1 }
    ];

    slides.forEach((slide, index) => {
      const div = document.createElement("div");
      div.className = "gallery__slide";
      div.dataset.active = String(index === 0);
      if (slide.warm) {
        div.style.backgroundImage =
          "radial-gradient(120% 110% at 70% 10%, var(--c-stage-alt-1) 0%, var(--c-stage-alt-2) 70%)";
      }
      div.append(
        window.SHELL.picture(slide.set, {
          alt: `${product.name} — ${slide.label}`,
          width: 1200,
          height: 1500
        })
      );
      stage.append(div);

      const thumb = document.createElement("button");
      thumb.type = "button";
      thumb.setAttribute("aria-pressed", String(index === 0));
      thumb.setAttribute("aria-label", `Show ${slide.label}`);
      thumb.append(
        window.SHELL.picture(slide.set, { alt: "", width: 200, height: 250 })
      );
      thumb.addEventListener("click", () => select(index));
      thumbs.append(thumb);
    });

    function select(index) {
      $$(".gallery__slide", stage).forEach((s, i) => (s.dataset.active = String(i === index)));
      $$("button", thumbs).forEach((b, i) =>
        b.setAttribute("aria-pressed", String(i === index))
      );
    }

    // Hover zoom — transform only, follows the pointer.
    const img = () => $(".gallery__slide[data-active='true'] img", stage);
    stage.addEventListener("pointermove", (e) => {
      if (window.matchMedia("(hover: none)").matches) return;
      const rect = stage.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const target = img();
      if (!target) return;
      target.style.setProperty("--zoom", "1.8");
      target.style.setProperty("--zoom-x", `${x}%`);
      target.style.setProperty("--zoom-y", `${y}%`);
      stage.dataset.zoomed = "true";
    });
    stage.addEventListener("pointerleave", () => {
      const target = img();
      if (!target) return;
      target.style.setProperty("--zoom", "1");
      stage.dataset.zoomed = "false";
    });

    // Swipe between slides on touch, keeping the native vertical scroll.
    let startX = null;
    stage.addEventListener("pointerdown", (e) => (startX = e.clientX));
    stage.addEventListener("pointerup", (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) < 48) return;
      const current = $$(".gallery__slide", stage).findIndex((s) => s.dataset.active === "true");
      const next = Math.max(
        0,
        Math.min(slides.length - 1, (current < 0 ? 0 : current) + (dx < 0 ? 1 : -1))
      );
      select(next);
    });
  }

  /* --------------------------------------------------------- accordions */
  function wireAccordions() {
    $$(".acc__trigger").forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const open = trigger.getAttribute("aria-expanded") === "true";
        trigger.setAttribute("aria-expanded", String(!open));
        const panel = document.getElementById(trigger.getAttribute("aria-controls"));
        if (panel) panel.hidden = open;
      });
    });
  }

  /* --------------------------------------------------- gift personalisation */
  function wireGift() {
    const input = $("[data-engrave-input]");
    const counter = $("[data-engrave-count]");
    const meta = $("[data-engrave-meta]");
    const preview = $("[data-engrave-preview]");
    const confirm = $("[data-engrave-confirm]");
    const MAX = Number(input.maxLength) || 12;

    function paint() {
      const text = state.engraving.trim();
      preview.textContent = text || "";
      preview.dataset.style = state.engravingStyle;
      preview.dataset.color = state.engravingColor;
      $("[data-engrave-placeholder]").hidden = text.length > 0;
      counter.textContent = `${input.value.length} / ${MAX}`;
      meta.dataset.over = String(input.value.length >= MAX);
    }

    input.addEventListener("input", () => {
      state.engraving = input.value;
      if (!state.engraving.trim()) {
        state.confirmed = false;
        confirm.checked = false;
      }
      paint();
      renderPrice();
    });

    confirm.addEventListener("change", () => {
      state.confirmed = confirm.checked;
      renderPrice();
    });

    $$("[data-engrave-style]").forEach((btn) =>
      btn.addEventListener("click", () => {
        state.engravingStyle = btn.dataset.engraveStyle;
        $$("[data-engrave-style]").forEach((b) =>
          b.setAttribute("aria-pressed", String(b === btn))
        );
        paint();
      })
    );

    $$("[data-engrave-color]").forEach((btn) =>
      btn.addEventListener("click", () => {
        state.engravingColor = btn.dataset.engraveColor;
        $$("[data-engrave-color]").forEach((b) =>
          b.setAttribute("aria-pressed", String(b === btn))
        );
        paint();
      })
    );

    $$("[data-wrap]").forEach((btn) =>
      btn.addEventListener("click", () => {
        state.wrap = btn.dataset.wrap;
        $$("[data-wrap]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      })
    );

    paint();
  }

  /* ----------------------------------------------------------- cart / wish */
  function wireBuy() {
    $("[data-add-to-cart]").addEventListener("click", (e) => {
      window.SHELL.CART.add(product, state.size);
      window.SHELL.toast(`${product.name} · ${state.size.label} added`);
      const trigger = $("[data-cart-open]");
      $(`[data-cart-open]`)?.click();
      e.currentTarget.blur();
    });

    // Mobile bar mirrors the main button.
    $("[data-buy-bar-add]").addEventListener("click", () => {
      window.SHELL.CART.add(product, state.size);
      window.SHELL.toast(`${product.name} · ${state.size.label} added`);
      $("[data-cart-open]")?.click();
    });

    const wish = $("[data-wishlist]");
    wish.addEventListener("click", () => {
      state.wished = !state.wished;
      wish.setAttribute("aria-pressed", String(state.wished));
      window.SHELL.toast(state.wished ? "Saved to your wishlist" : "Removed from your wishlist");
    });
  }

  /* --------------------------------------------------------- related rail */
  function renderRelated() {
    const rail = $("[data-related]");
    const pool = catalog
      .filter((p) => p.slug !== product.slug)
      .sort(
        (a, b) =>
          Number(b.family === product.family) - Number(a.family === product.family) ||
          Number(b.isNew) - Number(a.isNew)
      )
      .slice(0, 6);

    pool.forEach((item) => {
      const card = document.createElement("a");
      card.href = `product.html?slug=${encodeURIComponent(item.slug)}`;
      card.className = "card";
      card.innerHTML = `
        <figure class="card__stage" style="margin:0">
          <div class="card__layer">${""}</div>
        </figure>
        <p class="card__meta"><span>${item.gender}</span><span class="card__dot"></span><span>${item.family}</span></p>
        <h3 class="card__name">${item.name}</h3>
        <p class="card__price">${currency(item.price)}</p>`;
      card.querySelector(".card__layer").append(
        window.SHELL.picture(imageSet(item, "card-800").path, {
          alt: `${item.name} in its bottle`,
          width: 800,
          height: 1000
        })
      );
      rail.append(card);
    });

    const step = () => Math.min(rail.clientWidth * 0.8, 560);
    $("[data-rail-prev]")?.addEventListener("click", () =>
      rail.scrollBy({ left: -step(), behavior: "smooth" })
    );
    $("[data-rail-next]")?.addEventListener("click", () =>
      rail.scrollBy({ left: step(), behavior: "smooth" })
    );
  }

  /* ------------------------------------------------------ mobile buy bar */
  function wireBuyBar() {
    const bar = $("[data-buy-bar]");
    const anchor = $("[data-buy-anchor]");
    if (!bar || !anchor || !("IntersectionObserver" in window)) return;
    new IntersectionObserver(
      ([entry]) => {
        bar.dataset.visible = String(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 }
    ).observe(anchor);
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderInfo();
    renderGallery();
    wireAccordions();
    wireGift();
    wireBuy();
    renderRelated();
    wireBuyBar();
    $("[data-buy-bar-name]").textContent = product.name;
    $("[data-buy-bar-price]").textContent = currency(product.price);
  });
})();
