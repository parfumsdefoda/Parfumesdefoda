# Project Cleanup & Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix discovered issues (duplicate constants, empty dirs, missing tests, no CI) and add sample products to expand the catalog.

**Architecture:** Consolidate constants into one file, remove dead directories, add vitest + unit tests for all `src/lib/` utilities, add GitHub Actions CI, add 3 sample products, and fix AGENTS.md documentation mismatch.

**Tech Stack:** TypeScript, Vitest, GitHub Actions, JSON

## Global Constraints

- All user-facing text in Arabic (use `locales/ar.json`)
- All store data in `data/` JSON files — never hardcode prices, colors, contact info
- Verification order: `validate-json → typecheck → lint → build`
- Client components must never import types from `src/services/*` (use `src/types/services.ts`)
- Use logical CSS properties (RTL: `ms-`/`me-` not `ml-`/`mr-`)

---

## Task 1: Consolidate Constants

**Covers:** Duplicate constants issue

**Files:**
- Modify: `src/config/constants.ts` — consolidate all constants here
- Modify: `src/config/site.ts` — import from constants.ts instead of redefining
- Delete: `src/constants/index.ts` — merged into config/constants.ts

**Interfaces:**
- Produces: `STORAGE_KEYS`, `SITE_NAME`, `SITE_URL`, `CURRENCY`, `GRID_COLUMNS`, `BREAKPOINTS`, `CONTACT`

- [ ] **Step 1: Update `src/config/constants.ts`**

```typescript
/**
 * Shared application constants.
 */

// Site
export const SITE_NAME = "Parfums De Foda";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://parfumsdefoda.com";
export const CURRENCY = "EGP";

// LocalStorage keys
export const STORAGE_KEYS = {
  CART: "parfumsdefoda-cart",
  WISHLIST: "parfumsdefoda-wishlist",
} as const;

// Contact information (also available in data/contact.json)
export const CONTACT = {
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "201234567890",
  email: process.env.NEXT_PUBLIC_EMAIL || "info@parfumsdefoda.com",
} as const;

// Grid columns for responsive layout
export const GRID_COLUMNS = {
  DESKTOP: 4,
  TABLET: 2,
  MOBILE: 1,
} as const;

// Breakpoints
export const BREAKPOINTS = {
  DESKTOP: 1024,
  TABLET: 768,
} as const;
```

- [ ] **Step 2: Update `src/config/site.ts` to import from constants**

```typescript
/**
 * Site configuration.
 *
 * Most values are loaded from JSON files at runtime.
 * This file only contains build-time constants.
 */

import { SITE_NAME, SITE_URL, GRID_COLUMNS, BREAKPOINTS } from "./constants";

export const SITE = {
  name: SITE_NAME,
  url: SITE_URL,
  locale: "ar_AR",
  direction: "rtl" as const,
  language: "ar" as const,
} as const;

export const GRID = {
  desktop: GRID_COLUMNS.DESKTOP,
  tablet: GRID_COLUMNS.TABLET,
  mobile: GRID_COLUMNS.MOBILE,
} as const;

export const BREAKPOINTS_EXPORT = {
  desktop: BREAKPOINTS.DESKTOP,
  tablet: BREAKPOINTS.TABLET,
} as const;
```

- [ ] **Step 3: Delete `src/constants/index.ts`**

```bash
rm src/constants/index.ts
rmdir src/constants
```

- [ ] **Step 4: Verify no broken imports**

Run: `npm run typecheck`
Expected: PASS (no imports from `@/constants` or `@/config/constants` found in codebase)

---

## Task 2: Remove Empty Placeholder Directories

**Covers:** Empty placeholder directories issue

**Files:**
- Delete: `src/store/`, `src/actions/`, `src/middleware/`, `src/assets/`
- Delete: `tests/e2e/`, `tests/integration/`, `tests/unit/`
- Delete: `public/fonts/`, `public/icons/`, `public/banners/`, `public/illustrations/`, `public/patterns/`, `public/ui/`, `public/data/`

- [ ] **Step 1: Remove empty src directories**

```bash
rmdir src/store src/actions src/middleware src/assets
```

- [ ] **Step 2: Remove empty test directories**

```bash
rmdir tests/e2e tests/integration tests/unit
rmdir tests
```

- [ ] **Step 3: Remove empty public directories**

```bash
rmdir public/fonts public/icons public/banners public/illustrations public/patterns public/ui public/data
```

- [ ] **Step 4: Verify build still works**

Run: `npm run build`
Expected: PASS

---

## Task 3: Add Vitest for Unit Testing

**Covers:** No tests issue

**Files:**
- Modify: `package.json` — add vitest dependency and test script
- Create: `vitest.config.ts` — vitest configuration

**Interfaces:**
- Produces: `npm test` command that runs vitest

- [ ] **Step 1: Install vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Create `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

- [ ] **Step 3: Update `package.json` test script**

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify vitest works**

Run: `npm test`
Expected: PASS (no test files yet, but vitest should run without errors)

---

## Task 4: Add Unit Tests for `src/lib/` Utilities

**Covers:** Missing tests issue

**Files:**
- Create: `src/lib/currency.test.ts`
- Create: `src/lib/validation.test.ts`
- Create: `src/lib/filter-helpers.test.ts`
- Create: `src/lib/search-helpers.test.ts`
- Create: `src/lib/sort-helpers.test.ts`
- Create: `src/lib/locale.test.ts`
- Create: `src/lib/product-helpers.test.ts`

**Interfaces:**
- Consumes: All functions from `src/lib/*.ts`
- Produces: Passing test suite

- [ ] **Step 1: Create `src/lib/currency.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { formatPrice, formatNumber } from "./currency";

describe("formatPrice", () => {
  it("formats integer price with Arabic numerals", () => {
    const result = formatPrice(1200);
    expect(result).toContain("١٬٢٠٠");
    expect(result).toContain("ج.م");
  });

  it("formats decimal price", () => {
    const result = formatPrice(50.5);
    expect(result).toContain("٥٠٫٥");
  });

  it("formats zero", () => {
    const result = formatPrice(0);
    expect(result).toContain("٠");
  });
});

describe("formatNumber", () => {
  it("formats number without currency", () => {
    const result = formatNumber(1200);
    expect(result).toBe("١٬٢٠٠");
  });
});
```

- [ ] **Step 2: Create `src/lib/validation.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { isValidEgyptianPhone } from "./validation";

describe("isValidEgyptianPhone", () => {
  it("accepts 01xxxxxxxxx format", () => {
    expect(isValidEgyptianPhone("01234567890")).toBe(true);
  });

  it("accepts +20xxxxxxxxxx format", () => {
    expect(isValidEgyptianPhone("+201234567890")).toBe(true);
  });

  it("accepts 0020xxxxxxxxxx format", () => {
    expect(isValidEgyptianPhone("00201234567890")).toBe(true);
  });

  it("accepts with spaces and dashes", () => {
    expect(isValidEgyptianPhone("012 345 67890")).toBe(true);
    expect(isValidEgyptianPhone("012-345-67890")).toBe(true);
  });

  it("rejects invalid numbers", () => {
    expect(isValidEgyptianPhone("12345")).toBe(false);
    expect(isValidEgyptianPhone("01012345678")).toBe(false);
    expect(isValidEgyptianPhone("")).toBe(false);
  });
});
```

- [ ] **Step 3: Create `src/lib/filter-helpers.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { filterProducts, toggleFilter, countActiveFilters } from "./filter-helpers";
import type { Product } from "@/types";

const mockProducts: Product[] = [
  {
    id: "1",
    slug: "product-1",
    name: "Test Product 1",
    brand: "Test Brand",
    description: "Test description",
    gender: "رجالي",
    categories: ["رجالي", "شرقي"],
    type: "normal",
    image: "/test.webp",
    sizes: [{ label: "50ml", price: 100 }],
    stock: 10,
    badge: "new",
  },
  {
    id: "2",
    slug: "product-2",
    name: "Test Product 2",
    brand: "Test Brand",
    description: "Test description",
    gender: "حريمي",
    categories: ["حريمي", "غربي"],
    type: "niche",
    image: "/test2.webp",
    sizes: [{ label: "30ml", price: 200 }],
    stock: 5,
    badge: "best-seller",
  },
];

describe("filterProducts", () => {
  it("returns all products when no filters active", () => {
    expect(filterProducts(mockProducts, {})).toHaveLength(2);
  });

  it("filters by gender", () => {
    const result = filterProducts(mockProducts, { الجنس: ["رجالي"] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters by multiple groups (AND logic)", () => {
    const result = filterProducts(mockProducts, {
      الجنس: ["رجالي"],
      النوع: ["شرقي"],
    });
    expect(result).toHaveLength(1);
  });
});

describe("toggleFilter", () => {
  it("adds filter when not active", () => {
    const result = toggleFilter({}, "group", "slug");
    expect(result.group).toEqual(["slug"]);
  });

  it("removes filter when active", () => {
    const result = toggleFilter({ group: ["slug"] }, "group", "slug");
    expect(result.group).toEqual([]);
  });
});

describe("countActiveFilters", () => {
  it("counts all active filters", () => {
    expect(countActiveFilters({ a: ["1", "2"], b: ["3"] })).toBe(3);
  });

  it("returns 0 for empty filters", () => {
    expect(countActiveFilters({})).toBe(0);
  });
});
```

- [ ] **Step 4: Create `src/lib/search-helpers.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { searchProducts } from "./search-helpers";
import type { Product } from "@/types";

const mockProducts: Product[] = [
  {
    id: "1",
    slug: "sajdah",
    name: "عطر سجدة",
    brand: "Parfums De Foda",
    description: "عطر شرقي فاخر",
    gender: "رجالي",
    categories: ["رجالي", "شرقي"],
    type: "gold",
    image: "/test.webp",
    sizes: [{ label: "50ml", price: 600 }],
    stock: 10,
    tags: ["عود", "عنبر"],
  },
];

describe("searchProducts", () => {
  it("returns all products for empty query", () => {
    expect(searchProducts(mockProducts, "")).toHaveLength(1);
  });

  it("matches by name", () => {
    expect(searchProducts(mockProducts, "سجدة")).toHaveLength(1);
  });

  it("matches by brand", () => {
    expect(searchProducts(mockProducts, "Parfums")).toHaveLength(1);
  });

  it("matches by tag", () => {
    expect(searchProducts(mockProducts, "عود")).toHaveLength(1);
  });

  it("returns empty for no match", () => {
    expect(searchProducts(mockProducts, "xyz")).toHaveLength(0);
  });
});
```

- [ ] **Step 5: Create `src/lib/sort-helpers.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { sortProducts } from "./sort-helpers";
import type { Product } from "@/types";

const mockProducts: Product[] = [
  {
    id: "1",
    slug: "a",
    name: "ب",
    brand: "B",
    description: "",
    gender: "رجالي",
    categories: [],
    type: "normal",
    image: "",
    sizes: [{ label: "50ml", price: 200 }],
    stock: 10,
    rating: 3,
    featured: true,
  },
  {
    id: "2",
    slug: "b",
    name: "أ",
    brand: "A",
    description: "",
    gender: "رجالي",
    categories: [],
    type: "normal",
    image: "",
    sizes: [{ label: "50ml", price: 100 }],
    stock: 10,
    rating: 5,
    featured: false,
  },
];

describe("sortProducts", () => {
  it("sorts by price ascending", () => {
    const result = sortProducts(mockProducts, "price-asc");
    expect(result[0].id).toBe("2");
  });

  it("sorts by price descending", () => {
    const result = sortProducts(mockProducts, "price-desc");
    expect(result[0].id).toBe("1");
  });

  it("sorts by rating", () => {
    const result = sortProducts(mockProducts, "rating");
    expect(result[0].id).toBe("2");
  });

  it("sorts by featured", () => {
    const result = sortProducts(mockProducts, "featured");
    expect(result[0].id).toBe("1");
  });

  it("does not mutate original array", () => {
    const original = [...mockProducts];
    sortProducts(mockProducts, "price-asc");
    expect(mockProducts).toEqual(original);
  });
});
```

- [ ] **Step 6: Create `src/lib/locale.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { t } from "./locale";
import type { LocaleMessages } from "@/types/services";

const messages: LocaleMessages = {
  nav: { home: "الرئيسية" },
  cart: { title: "سلة التسوق", empty: "السلة فارغة" },
} as LocaleMessages;

describe("t", () => {
  it("resolves dot-path", () => {
    expect(t(messages, "nav.home")).toBe("الرئيسية");
  });

  it("resolves nested path", () => {
    expect(t(messages, "cart.title")).toBe("سلة التسوق");
  });

  it("returns fallback for missing key", () => {
    expect(t(messages, "missing.key", "fallback")).toBe("fallback");
  });

  it("returns path as fallback when no fallback provided", () => {
    expect(t(messages, "missing.key")).toBe("missing.key");
  });
});
```

- [ ] **Step 7: Create `src/lib/product-helpers.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import {
  isValidProduct,
  validateProducts,
  isProductInStock,
  findProductById,
  findProductBySlug,
  getFeaturedProducts,
} from "./product-helpers";
import type { Product } from "@/types";

const validProduct: Product = {
  id: "1",
  slug: "test",
  name: "Test",
  brand: "Brand",
  description: "Desc",
  gender: "male",
  categories: ["cat"],
  type: "normal",
  image: "/test.webp",
  sizes: [{ label: "50ml", price: 100 }],
  stock: 10,
};

describe("isValidProduct", () => {
  it("returns true for valid product", () => {
    expect(isValidProduct(validProduct)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isValidProduct(null)).toBe(false);
  });

  it("returns false for missing required fields", () => {
    expect(isValidProduct({ id: "1" })).toBe(false);
  });
});

describe("validateProducts", () => {
  it("filters out invalid products", () => {
    const result = validateProducts([validProduct, null, { id: "bad" }]);
    expect(result).toHaveLength(1);
  });
});

describe("isProductInStock", () => {
  it("returns true when in stock", () => {
    expect(isProductInStock(validProduct)).toBe(true);
  });

  it("returns false when out of stock", () => {
    expect(isProductInStock({ ...validProduct, stock: 0 })).toBe(false);
  });

  it("checks specific size stock", () => {
    expect(isProductInStock(validProduct, "50ml")).toBe(true);
  });
});

describe("findProductById", () => {
  it("finds product by id", () => {
    expect(findProductById([validProduct], "1")).toBe(validProduct);
  });

  it("returns undefined for missing id", () => {
    expect(findProductById([validProduct], "999")).toBeUndefined();
  });
});

describe("findProductBySlug", () => {
  it("finds product by slug", () => {
    expect(findProductBySlug([validProduct], "test")).toBe(validProduct);
  });
});

describe("getFeaturedProducts", () => {
  it("filters featured products", () => {
    const featured = { ...validProduct, featured: true };
    const notFeatured = { ...validProduct, id: "2", featured: false };
    expect(getFeaturedProducts([featured, notFeatured])).toHaveLength(1);
  });
});
```

- [ ] **Step 8: Run all tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 9: Verify build still works**

Run: `npm run build`
Expected: PASS

---

## Task 5: Add GitHub Actions CI

**Covers:** No CI/CD issue

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    name: Validate & Build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Validate JSON
        run: npm run validate-json

      - name: Type check
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build
```

- [ ] **Step 2: Verify workflow syntax**

```bash
cat .github/workflows/ci.yml
```

Expected: Valid YAML with all 5 steps

---

## Task 6: Add Sample Products

**Covers:** Single product catalog issue

**Files:**
- Modify: `data/products.json` — convert to array, add 3 sample products

**Interfaces:**
- Consumes: Product type from `src/types/product.ts`
- Produces: `data/products.json` as array with 4 products

- [ ] **Step 1: Update `data/products.json`**

```json
[
  {
    "id": "001",
    "slug": "noor-al-ward",
    "sku": "FD-NEW-001",
    "name": "نور الورد",
    "brand": "Parfums De Foda",
    "description": "عطر نسائي رقيق يجمع بين أنوار الورد الفرنسي والياسمين المصري مع لمسة من المسك الأبيض.",
    "gender": "حريمي",
    "categories": ["حريمي", "شرقي"],
    "tags": ["ورد", "ياسمين", "نسائي", "رقيق"],
    "badge": "new",
    "featured": true,
    "type": "niche",
    "rating": 4.8,
    "reviews": 12,
    "image": "/products/001.webp",
    "gallery": ["/products/001.webp"],
    "sizes": [
      { "label": "50 مل", "price": 550, "stock": 15 },
      { "label": "30 مل", "price": 380, "stock": 20 },
      { "label": "عينة 2.5 مل", "price": 55, "stock": 80 }
    ],
    "stock": 115,
    "notes": {
      "top": ["برغموت", "ورد"],
      "middle": ["ياسمين", "سوسن"],
      "base": ["مسك", "خشب الصندل"]
    },
    "status": "active",
    "sortOrder": 2,
    "seo": {
      "title": "نور الورد | Parfums De Foda",
      "description": "نور الورد من فوده للعطور، عطر نسائي رقيق بلمسات من الورد والياسمين."
    }
  },
  {
    "id": "002",
    "slug": "sajdah",
    "sku": "FD-SAJ-001",
    "name": "عطر سجدة",
    "brand": "Parfums De Foda",
    "description": "عطر شرقي فاخر يمزج بين العود والعنبر والمسك مع لمسات من الورد والتوابل الشرقية ليمنحك حضورًا يدوم طوال اليوم.",
    "gender": "رجالي",
    "categories": ["رجالي", "شرقي", "نيش"],
    "tags": ["عود", "عنبر", "مسك", "شرقي", "فاخر"],
    "badge": "best-seller",
    "featured": true,
    "type": "gold",
    "rating": 5,
    "reviews": 18,
    "image": "/products/002.webp",
    "gallery": ["/products/002.webp"],
    "sizes": [
      { "label": "50 مل", "price": 600, "stock": 20 },
      { "label": "30 مل", "price": 420, "stock": 25 },
      { "label": "عينة 2.5 مل", "price": 60, "stock": 100 }
    ],
    "stock": 145,
    "notes": {
      "top": ["زعفران", "هيل"],
      "middle": ["ورد", "ياسمين"],
      "base": ["عود", "عنبر", "مسك"]
    },
    "status": "active",
    "sortOrder": 1,
    "seo": {
      "title": "عطر سجدة | Parfums De Foda",
      "description": "عطر سجدة من فوده للعطور، عطر شرقي فاخر بلمسات من العود والعنبر والمسك."
    }
  },
  {
    "id": "003",
    "slug": "oud-imperial",
    "sku": "FD-OUD-003",
    "name": "عود إمبراطوري",
    "brand": "Parfums De Foda",
    "description": "عطر رجالي قوي بنفحات العود الكمبودي مع العنبر واللابدانوم لحضور ملكي لا يُنسى.",
    "gender": "رجالي",
    "categories": ["رجالي", "شرقي", "بريميم"],
    "tags": ["عود", "عنبر", "لابدانوم", "قوي", "ملكي"],
    "badge": "limited",
    "featured": false,
    "type": "gold",
    "rating": 4.9,
    "reviews": 8,
    "image": "/products/003.webp",
    "gallery": ["/products/003.webp"],
    "sizes": [
      { "label": "100 مل", "price": 950, "stock": 10 },
      { "label": "50 مل", "price": 650, "stock": 15 },
      { "label": "عينة 2.5 مل", "price": 75, "stock": 50 }
    ],
    "stock": 75,
    "notes": {
      "top": ["لابدانوم", "فلفل وردي"],
      "middle": ["ورد دمشقي", "سدر"],
      "base": ["عود كمبودي", "عنبر", "مسك"]
    },
    "status": "active",
    "sortOrder": 3,
    "seo": {
      "title": "عود إمبراطوري | Parfums De Foda",
      "description": "عود إمبراطوري من فوده للعطور، عطر رجالي قوي بنفحات العود الكمبودي."
    }
  },
  {
    "id": "004",
    "slug": "french-oud",
    "sku": "FD-FR-004",
    "name": "فرنش عود",
    "brand": "Parfums De Foda",
    "description": "عطر غربي شرقي يجمع بين أصالة العود الفرنسي مع لمسات عصرية من الليمون والبرغموت.",
    "gender": "رجالي",
    "categories": ["رجالي", "غربي"],
    "tags": ["عود", "ليمون", "برغموت", "عصري", "غربي"],
    "badge": "new",
    "featured": true,
    "type": "normal",
    "rating": 4.7,
    "reviews": 6,
    "image": "/products/004.webp",
    "gallery": ["/products/004.webp"],
    "sizes": [
      { "label": "75 مل", "price": 450, "stock": 20 },
      { "label": "50 مل", "price": 350, "stock": 25 },
      { "label": "عينة 2.5 مل", "price": 45, "stock": 60 }
    ],
    "stock": 105,
    "notes": {
      "top": ["ليمون", "برغموت"],
      "middle": ["خزامى", "ياسمين"],
      "base": ["عود فرنسي", "فولتونيا", "مسك"]
    },
    "status": "active",
    "sortOrder": 4,
    "seo": {
      "title": "فرنش عود | Parfums De Foda",
      "description": "فرنش عود من فوده للعطور، عطر غربي شرقي يجمع بين الأصالة والعصرية."
    }
  }
]
```

- [ ] **Step 2: Validate JSON**

Run: `npm run validate-json`
Expected: PASS

- [ ] **Step 3: Type check**

Run: `npm run typecheck`
Expected: PASS

---

## Task 7: Fix AGENTS.md Documentation

**Covers:** Cart hydration documentation mismatch

**Files:**
- Modify: `AGENTS.md` — update CartProvider description

- [ ] **Step 1: Update AGENTS.md**

Find and replace the CartProvider description:

Old:
```
- `CartProvider` uses lazy `useState` init (`getInitialCart()`) to read localStorage — no setState in effects.
```

New:
```
- `CartProvider` initializes with `[]` (matching server render) and hydrates from localStorage in `useEffect` — prevents hydration mismatch.
```

- [ ] **Step 2: Verify no other references**

Search for `getInitialCart` or `lazy useState` in AGENTS.md to ensure no other stale references.

---

## Task 8: Final Verification

**Covers:** All tasks

**Files:**
- None (verification only)

- [ ] **Step 1: Run full verification sequence**

```bash
npm run validate-json
npm run typecheck
npm run lint
npm test
npm run build
```

Expected: All PASS

- [ ] **Step 2: Verify directory structure is clean**

```bash
ls src/
```

Expected: No `store/`, `actions/`, `middleware/`, `assets/` directories

```bash
ls tests/ 2>/dev/null || echo "tests/ removed"
```

Expected: `tests/` directory removed

---

## Summary

| Task | Description | Files Changed |
|------|-------------|---------------|
| 1 | Consolidate constants | 3 files (modify 2, delete 1) |
| 2 | Remove empty directories | 14 directories deleted |
| 3 | Add Vitest | 2 files (package.json, vitest.config.ts) |
| 4 | Add unit tests | 7 test files created |
| 5 | Add GitHub Actions CI | 1 file created |
| 6 | Add sample products | 1 file modified |
| 7 | Fix AGENTS.md | 1 file modified |
| 8 | Final verification | 0 files |
