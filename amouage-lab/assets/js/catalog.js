/* ==========================================================================
   7. CATALOGUE LOGIC
   --------------------------------------------------------------------------
   State lives in the URL (?gender=…&family=…&q=…&sort=…), the same contract the
   shop uses: a filtered collection is a shareable, back-button-safe address.
   Everything renders from window.LAB_CATALOG, so no count is ever hard-coded.
   ========================================================================== */
(function () {
  "use strict";

  const $ = (s, scope = document) => scope.querySelector(s);
  const $$ = (s, scope = document) => Array.from(scope.querySelectorAll(s));
  const { catalog, currency, imageSet } = window.LAB;
  const params = new URLSearchParams(window.location.search);

  const state = {
    gender: new Set(params.getAll("gender")),
    family: new Set(params.getAll("family")),
    scent: new Set(params.getAll("scent")),
    q: (params.get("q") || "").trim().toLowerCase(),
    min: Number(params.get("min")) || 0,
    max: Number(params.get("max")) || 0,
    sort: params.get("sort") || "featured"
  };

  /* -------------------------------------------------------- filter engine */
  function matches(product) {
    if (state.gender.size && !state.gender.has(product.gender)) return false;
    if (state.family.size && !state.family.has(product.family)) return false;
    if (state.scent.size && !product.tags.some((t) => state.scent.has(t))) return false;
    if (state.min && product.price < state.min) return false;
    if (state.max && product.price > state.max) return false;
    if (state.q) {
      const haystack = [
        product.name,
        product.collection,
        product.family,
        product.description,
        ...product.tags,
        ...product.notes.top,
        ...product.notes.heart,
        ...product.notes.base
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(state.q)) return false;
    }
    return true;
  }

  const SORTERS = {
    featured: (a, b) => Number(b.isNew) - Number(a.isNew) || a.price - b.price,
    new: (a, b) => Number(b.isNew) - Number(a.isNew),
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    name: (a, b) => a.name.localeCompare(b.name)
  };

  /* ----------------------------------------------------------- card build */
  function card(product) {
    const el = document.createElement("article");
    el.className = `card reveal${product.soldOut ? " is-soldout" : ""}`;

    const link = document.createElement("a");
    link.href = `product.html?slug=${encodeURIComponent(product.slug)}`;
    link.className = "card__link";
    link.style.display = "grid";
    link.style.gap = "var(--sp-3)";
    link.setAttribute(
      "aria-label",
      `${product.name}, ${product.collection} collection, from ${currency(product.price)}`
    );

    // Stage: two stacked layers → the second crossfades in on hover.
    const stage = document.createElement("figure");
    stage.className = "card__stage";
    stage.style.margin = "0";

    const primary = document.createElement("div");
    primary.className = "card__layer";
    primary.append(
      window.SHELL.picture(imageSet(product, "card-800").path, {
        alt: `${product.name} in its bottle`,
        width: 800,
        height: 1000
      })
    );

    const alt = document.createElement("div");
    alt.className = "card__layer card__layer--alt";
    alt.append(
      window.SHELL.picture(imageSet(product, "card-800").path, {
        alt: "",
        width: 800,
        height: 1000
      })
    );
    const scent = document.createElement("span");
    scent.className = "card__scent";
    scent.textContent = `${product.family} · ${product.notes.heart[0]}`;
    alt.append(scent);

    stage.append(primary, alt);

    if (product.isNew) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "New";
      stage.append(badge);
    }
    if (product.soldOut) {
      const out = document.createElement("span");
      out.className = "badge badge--soldout";
      out.textContent = "Out of stock";
      stage.append(out);
    }

    const meta = document.createElement("p");
    meta.className = "card__meta";
    meta.innerHTML = `<span>${product.gender}</span><span class="card__dot"></span><span>${product.collection}</span>`;

    const name = document.createElement("h3");
    name.className = "card__name";
    name.textContent = product.name;

    const priceRow = document.createElement("p");
    priceRow.style.display = "flex";
    priceRow.style.alignItems = "baseline";
    priceRow.style.gap = "var(--sp-3)";
    priceRow.innerHTML = `<span class="card__price">${currency(product.price)}</span><span class="card__variants">${product.sizes.length} sizes</span>`;

    link.append(stage, meta, name, priceRow);
    el.append(link);
    return el;
  }

  /* --------------------------------------------------------------- facets */
  function renderFamilyFacet() {
    const host = $('[data-facet="family"]');
    if (!host) return;
    const families = [...new Set(catalog.map((p) => p.family))].sort();
    host.innerHTML = families
      .map((family) => {
        const count = catalog.filter((p) => p.family === family).length;
        return `<label class="check">
          <input type="checkbox" value="${family}" ${state.family.has(family) ? "checked" : ""} />
          ${family} <span class="check__count">${count}</span>
        </label>`;
      })
      .join("");
    host.addEventListener("change", (e) => {
      if (!e.target.matches("input")) return;
      e.target.checked ? state.family.add(e.target.value) : state.family.delete(e.target.value);
      update();
    });
  }

  function renderGenderCounts() {
    $$("[data-count]").forEach((el) => {
      const [, value] = el.dataset.count.split(":");
      el.textContent = catalog.filter((p) => p.gender === value).length;
    });
    $$('[data-facet="gender"] input').forEach((input) => {
      input.checked = state.gender.has(input.value);
      input.addEventListener("change", () => {
        input.checked ? state.gender.add(input.value) : state.gender.delete(input.value);
        update();
      });
    });
  }

  function renderScentPills() {
    const host = $("[data-scent-pills]");
    if (!host) return;
    const scents = [...new Set(catalog.flatMap((p) => p.tags))].slice(0, 10);
    host.innerHTML = scents
      .map(
        (scent) =>
          `<button class="pill" type="button" data-scent="${scent}" aria-pressed="${state.scent.has(scent)}">${scent}</button>`
      )
      .join("");
    host.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-scent]");
      if (!btn) return;
      const value = btn.dataset.scent;
      state.scent.has(value) ? state.scent.delete(value) : state.scent.add(value);
      btn.setAttribute("aria-pressed", String(state.scent.has(value)));
      update();
    });
  }

  /* --------------------------------------------------------------- render */
  const grid = $("[data-grid]");
  const countEl = $("[data-result-count]");
  const emptyEl = $("[data-empty]");

  function render() {
    const results = catalog.filter(matches).sort(SORTERS[state.sort] || SORTERS.featured);
    grid.innerHTML = "";
    results.forEach((product) => grid.append(card(product)));
    grid.setAttribute("aria-busy", "false");

    countEl.textContent = `${results.length} ${results.length === 1 ? "composition" : "compositions"}`;
    emptyEl.hidden = results.length > 0;

    // Re-observe fresh cards so the reveal runs as they enter the viewport.
    if (window.SHELL.reduceMotion.matches) {
      $$(".card", grid).forEach((c) => c.classList.add("is-in"));
    } else {
      $$(".card", grid).forEach((c, i) => {
        c.style.setProperty("--reveal-delay", `${Math.min(i, 5) * 40}ms`);
        requestAnimationFrame(() => c.classList.add("is-in"));
      });
    }
  }

  /* ------------------------------------------------------------------ url */
  function syncUrl() {
    const next = new URLSearchParams();
    state.gender.forEach((v) => next.append("gender", v));
    state.family.forEach((v) => next.append("family", v));
    state.scent.forEach((v) => next.append("scent", v));
    if (state.q) next.set("q", state.q);
    if (state.min) next.set("min", String(state.min));
    if (state.max) next.set("max", String(state.max));
    if (state.sort !== "featured") next.set("sort", state.sort);
    const qs = next.toString();
    window.history.replaceState({}, "", `index.html${qs ? `?${qs}` : ""}`);
  }

  function update() {
    syncUrl();
    render();
  }

  /* --------------------------------------------------------------- wiring */
  function wire() {
    renderGenderCounts();
    renderFamilyFacet();
    renderScentPills();

    // A filter form must never navigate: Enter keeps the URL state in place.
    $("[data-filters]")?.addEventListener("submit", (e) => e.preventDefault());

    // Accordions
    $$(".facet__trigger").forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const open = trigger.getAttribute("aria-expanded") === "true";
        trigger.setAttribute("aria-expanded", String(!open));
        const panel = document.getElementById(trigger.getAttribute("aria-controls"));
        if (panel) panel.hidden = open;
      });
    });

    // Sort
    const sort = $("[data-sort]");
    if (sort) {
      sort.value = state.sort;
      sort.addEventListener("change", () => {
        state.sort = sort.value;
        update();
      });
    }

    // Price
    const priceForm = $('[aria-controls="facet-price"]')?.parentElement;
    priceForm?.querySelectorAll('input[name="min"], input[name="max"]').forEach((input) => {
      input.value = input.name === "min" ? state.min || "" : state.max || "";
      input.addEventListener("input", () => {
        state.min = Number(priceForm.querySelector('input[name="min"]').value) || 0;
        state.max = Number(priceForm.querySelector('input[name="max"]').value) || 0;
        update();
      });
    });

    // Clear
    $$("[data-reset]").forEach((btn) =>
      btn.addEventListener("click", () => {
        state.gender.clear();
        state.family.clear();
        state.scent.clear();
        state.q = "";
        state.min = 0;
        state.max = 0;
        state.sort = "featured";
        $$('[data-facet] input').forEach((i) => (i.checked = false));
        $$("[data-scent]").forEach((b) => b.setAttribute("aria-pressed", "false"));
        $$('input[name="min"], input[name="max"]').forEach((i) => (i.value = ""));
        if (sort) sort.value = "featured";
        update();
      })
    );

    // Mobile filter sheet
    const filters = $("[data-filters]");
    $("[data-open-filters]")?.addEventListener("click", () => {
      filters.dataset.open = "true";
      document.body.style.overflow = "hidden";
      window.SHELL.trapFocus(filters);
    });
    $("[data-close-filters]")?.addEventListener("click", (e) => {
      e.preventDefault();
      filters.dataset.open = "false";
      document.body.style.overflow = "";
    });

    // Result context line
    if (state.q) {
      const intro = $(".collection-intro");
      if (intro) intro.textContent = `Showing results for “${state.q}”.`;
    }
  }

  /* Skeleton → real cards. A 320ms beat keeps the placeholder honest while the
     catalogue script parses; a real store would await its API here. */
  document.addEventListener("DOMContentLoaded", () => {
    wire();
    setTimeout(() => {
      render();
    }, 320);
  });
})();
