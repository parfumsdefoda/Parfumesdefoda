# JSON Schema Reference — Parfums De Foda

## Product (`data/products.json`)

```json
[
  {
    "id": "p001",
    "slug": "royal-oud",
    "name": "Royal Oud",
    "brand": "Parfums De Foda",
    "description": "وصف العطر",
    "shortDescription": "وصف مختصر (اختياري)",
    "gender": "رجالي",
    "categories": ["رجالي", "شرقي"],
    "badge": "best-seller",
    "rating": 4.8,
    "featured": true,
    "type": "normal",
    "image": "/products/p001.webp",
    "gallery": ["/products/p001-angle1.webp"],
    "sizes": [
      { "label": "50 مل", "price": 1200, "stock": 10 }
    ],
    "stock": 25,
    "sku": "PDF-001",
    "createdAt": "2026-01-15",
    "updatedAt": "2026-07-01"
  }
]
```

## Theme (`data/theme.json`)

Controls all visual design tokens. Colors are injected as CSS custom properties.

## Settings (`data/settings.json`)

Controls store-level configuration: name, currency, grid layout.
