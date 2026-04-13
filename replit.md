# Que Lo Que — Dominican Delivery App

## Overview

"Que Lo Que" — a Dominican delivery app (like Uber Eats for the DR) with bold street energy.
Brand: deep royal blue background (`228 83% 9%`), electric yellow (#FFD700), white text.
Tagline: "Que lo que… ¿qué tú quieres?"
Four distinct user modes: customer, driver, business, admin.
Logo: motorcycle with lightning bolt (`/public/logo.png`, transparent PNG).

pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Routing**: wouter
- **Data fetching**: TanStack Query v5 + auto-generated hooks
- **Auth**: express-session (session-based), stored user in localStorage "qlq_user"
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## App Architecture

### Backend (`artifacts/api-server`)
- Express 5 API server at `/api/`
- Routes: auth, businesses, products, orders, drivers, admin, stats, points, addresses
- Session-based auth using `express-session`, `credentials: include` required
- Cash limit system: >8000 DOP = red warning, >10000 DOP = driver locked

### Fee & Revenue Structure
- **15% markup** on all product prices shown to customers (business gets original price, platform keeps 15%)
- **Delivery fee**: RD$150 base + RD$25/km — split 50/50 between platform and driver
- **Tips**: 100% go to the driver, added to their wallet on delivery
- Platform revenue = 15% food markup + 50% of delivery fee
- Driver earnings = 50% of delivery fee + 100% of tip
- Points: 1 point per RD$10 (based on pre-markup base price)

### Frontend (`artifacts/que-lo-que`)
- Single-page app with wouter routing
- `lib/auth.ts` — getStoredUser/setStoredUser/clearStoredUser + formatDOP
- `lib/cart.tsx` — CartProvider, useCart with localStorage persistence
- `components/BottomNav.tsx` — role-aware bottom navigation

### Routes
| Path | Component | Role |
|------|-----------|------|
| `/` | Landing | all |
| `/login` | Login | all |
| `/customer` | Customer Home | customer |
| `/customer/business/:id` | Business Store | customer |
| `/customer/cart` | Cart | customer |
| `/customer/orders` | Order List | customer |
| `/customer/orders/:id` | Order Detail | customer |
| `/driver` | Driver Dashboard | driver |
| `/driver/jobs` | Available Jobs | driver |
| `/driver/wallet` | Driver Wallet | driver |
| `/business` | Business Dashboard | business |
| `/business/orders` | Order Management | business |
| `/business/menu` | Menu Management | business |
| `/admin` | Admin Control Panel | admin |
| `/admin/users` | User Management | admin |
| `/admin/drivers` | Driver Management | admin |
| `/admin/businesses` | Business Management | admin |
| `/admin/orders` | All Orders | admin |

## Demo Credentials
All seeded in the database:
- customer@qlq.do / password123
- driver@qlq.do / password123
- business@qlq.do / password123
- admin@qlq.do / password123

## Seed Data
- 4 businesses: Pollo Rey (food), Supermercados Nacional (supermarket), Farmacia Carol (pharmacy), La Cava del Rey (liquor)
- 14 products across businesses
- 3 sample orders, wallet transactions

## Business Logic
- Delivery fee: 100 DOP base + 25/km
- Commission: 15% of order total
- Driver earns: 75% of delivery fee
- Cash limit: >8000 DOP warning, >10000 DOP = driver locked
- Bonus: every 10 deliveries completed
- Currency: Dominican Peso (DOP), formatted as "RD$ 1,200"

## API Hooks Pattern
Generated hooks via Orval from OpenAPI spec:
```typescript
// Always pass queryKey when using options
useListBusinesses(params, { query: { queryKey: getListBusinessesQueryKey(params) } })

// Admin hooks use "Admin" prefix
useAdminListUsers(params, { query: { queryKey: getAdminListUsersQueryKey() } })
```

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
