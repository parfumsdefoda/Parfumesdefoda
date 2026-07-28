# Architecture — Parfums De Foda

## Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS v4
- **UI:** Shadcn/UI (base-nova style)
- **Animation:** Framer Motion
- **Forms:** React Hook Form + Zod
- **Icons:** Lucide React

## Architecture Style

Feature-based. Each feature in `src/features/{name}/` owns its components, hooks, types, and utils.

## Data Flow

```
JSON files (data/, content/) → Services → Hooks → Components
```

## Key Decisions

- Single-page homepage (no navigation between pages)
- Cart is a drawer, not a page
- No account system
- No online payment
- Guest checkout only
- Orders sent via WhatsApp + Email
