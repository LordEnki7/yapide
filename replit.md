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
| `/business/analytics` | Sales Analytics | business |
| `/admin` | Admin Control Panel | admin |
| `/admin/users` | User Management | admin |
| `/admin/drivers` | Driver Management | admin |
| `/admin/businesses` | Business Management | admin |
| `/admin/orders` | All Orders | admin |
| `/admin/promo-codes` | Promo Code Management | admin |
| `/business/onboarding` | Business Setup Onboarding | business |
| `/driver/onboarding` | Driver Setup Onboarding | driver |

## Pre-Launch Fixes (implemented)
- **Driver job flow**: pending → business accepts → `accepted (no driver)` → driver claims → `accepted (with driverId)` → picked_up → delivered. Available-jobs shows `accepted + driverId IS NULL`. Active orders show step-by-step nav: pickup from business then delivery address.
- **Admin promo code UI**: `/admin/promo-codes` — list, create, toggle active, delete codes. Usage progress bars. `PATCH /api/promo-codes/:id` and `DELETE /api/promo-codes/:id` added.
- **Order cancellation**: Customer can cancel their own pending orders via `POST /api/orders/:id/cancel` (ownership-checked). OrderDetail shows cancelled state with red banner.
- **Card payment UX**: Payment toggle (cash/card) in Cart. Card shows "Próximamente 🔒" message and disables checkout button.
- **Self-registration onboarding**: After registering as business → `/business/onboarding` (creates business profile). After registering as driver → `/driver/onboarding` (creates driver profile with vehicle type/plate).
- **Business order rejection**: Already wired — business Orders page has reject button → sets `cancelled` status + push to customer.
- **Push improvements**: Drivers get push when business accepts an order. Customers get push for all status changes including cancelled. Driver gets "delivery asignado" push when driver claims job.

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

## Wave 3 Features (implemented)
- **Web Push Notifications**: VAPID keys auto-generated and stored in `settings` DB table. Service worker at `/sw.js` handles push events and shows OS-level notifications. `NotificationBell` component in all three role dashboards. Push sent when: order created (→ business owner), order accepted/picked_up/delivered (→ customer). Users can subscribe/unsubscribe with one click.
  - API: `GET /api/push/vapid-public-key`, `POST /api/push/subscribe`, `DELETE /api/push/unsubscribe`
  - DB: `push_subscriptions`, `settings` tables
- **WhatsApp Integration**: Order Detail page has a "Negocio" card with two buttons: "Chat" (opens WhatsApp with pre-filled message to business) and "Compartir" (creates a WhatsApp share of order details). Driver WhatsApp contact already existed. All deep-linked via `wa.me` (no API key needed).

## Wave 2 Features (implemented)
- **Proof of delivery**: Driver uploads a photo when marking order as delivered. Photo stored via object storage, shown in customer OrderDetail. Active order card in driver Jobs page with "Mark Picked Up" → "Mark Delivered" + photo flow.
- **Business analytics**: `GET /api/businesses/mine/analytics` — 7-day stats (revenue, orders, avg). Bar chart + top 5 products. Accessible from business dashboard.
- **Promo codes**: `promo_codes` DB table (code, discountType, discountValue, minOrder, maxUses, expiresAt). `POST /api/promo-codes/validate` validates codes. Cart has a promo code entry box; discount shown in order summary and stored on order.
- **PWA installable**: `manifest.json` + PWA meta tags in `index.html`. App is installable on mobile.

## DB Tables
- `users`, `businesses`, `products`, `drivers`, `orders`, `order_items`, `wallet_transactions`, `points_transactions`, `addresses`, `promo_codes`
- `orders` has: `deliveryPhotoPath`, `promoCode`, `promoDiscount` columns

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
