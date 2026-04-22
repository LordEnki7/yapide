# YaPide — Dominican Delivery App

## Overview

"YaPide" — a Dominican delivery app (like Uber Eats for the DR) with bold street energy.
Brand: deep royal navy blue (`228 83% 9%`), electric yellow (#FFD700), white text.
Tagline: "Entrega rápida y económica."
Four distinct user modes: customer, driver, business, admin.
Logo: `public/logo.png` (838×720 transparent PNG, motorcycle + YaPide text overlapping).
Bilingual ES/EN with Spanish as default.

## Logo / Splash Design (locked in)

- **"YaPide"** rendered as HTML text: `Ya` in #6be832 (green), `Pide` in white, font-size clamp(48px,13vw,64px), weight 900.
- **Tagline**: "ENTREGA RÁPIDA Y ECONÓMICA" — white + #FFD700 for "RÁPIDA", font-weight 800.
- **Motorcycle**: shown via `overflow:hidden` container with `aspectRatio: "1 / 0.44"` + `position:absolute; bottom:0` on the img. This crops to the bottom 44% of logo.png, revealing the full rider including helmet without any of the PNG's text zone bleeding through. Width: `clamp(120px, 32vw, 150px)`.
- Both SplashScreen.tsx and Landing.tsx use the same technique.
- The PNG text (top ~49%) and motorcycle rider (bottom ~51%) overlap slightly in the asset — do NOT attempt to cleanly separate them with a single horizontal cut; the overflow:hidden + aspectRatio approach is the final solution.

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

## GitHub

- **Repo**: https://github.com/LordEnki7/yapide.git (note: yapide not yapida)
- **Latest commit**: `037250a` — overflow:hidden motorcycle crop, no layout gap
- **Push**: `git push origin main` works directly (GITHUB_TOKEN configured)

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

## Wave 5 Features (implemented)
- **Driver audio readout**: `JobAlertModal` plays a 4-note AudioContext beep + Web Speech API readout in `es-DO` voice. Mute toggle (Volume2/VolumeX icon). Fires on every new job popup via `seenJobIds` dedup logic in Jobs.tsx.
- **Live driver map — fitBounds + destination pin**: `LiveDriverMap.tsx` geocodes the delivery address via Nominatim → places a green 📦 marker. `fitBounds` centers map to show driver + destination together. Legend bar below the map.
- **Phone + PIN login**: `pinHash` column added to `users` table (bcrypt hashed, 4–6 digit PIN). `POST /api/auth/phone-register` + `/api/auth/phone-login`. Synthetic email `phone_DIGITS@yapide.internal`. Login.tsx + Register.tsx have Email | Teléfono+PIN tab switcher.
- **WhatsApp notification log**: `notifications` table tracks every WhatsApp link sent (orderId, type, phone, deepLink, sentAt). Triggered in orders.ts on status change (accepted/picked_up/delivered/cancelled). Admin page `/admin/notifications` shows stats, filters, manual "Enviar" deep links. Bell icon added to admin dashboard grid.
- **Driver GPS tracking + quick-action bar**: GPS position sent every 10 s when order is `picked_up` via `PATCH /api/drivers/location`. Three-stage action buttons: "📍 Llegué al negocio" (orange) → "✅ Ya recogí" (blue) → "🎉 Entregado" (yellow), all `h-14 rounded-2xl` for thumb-tap comfort on mobile.

## Wave 4 Features (implemented)
- **Favorites**: Heart button on every business card — customers can save/unsave restaurants. Persisted in `favorites` DB table. API: `GET /api/favorites`, `POST /api/favorites/:bizId`, `DELETE /api/favorites/:bizId`.
- **Driver problem reporting**: "Reportar problema" link at bottom of every active order card. Bottom sheet with reason options (not home, wrong address, not answering, order issue, safety, other) + notes. Stored in `driver_reports` table via `POST /api/orders/:id/report-problem`.
- **Admin disputes & refunds**: New page `/admin/disputes`. Customers open disputes via `POST /api/orders/:id/dispute`. Admin sees all disputes with reason, customer info, order amount. Can resolve (with optional refund amount + notes) or reject via `PATCH /api/admin/disputes/:id/resolve`. "Disputas" tile added to admin dashboard nav.
- **Manual driver assignment**: Admin orders page now shows "Asignar driver" button on pending/accepted orders. Opens a bottom sheet listing all approved drivers with name/vehicle/city/rating/online status. Admin selects and confirms. API: `POST /api/admin/orders/:id/assign-driver`.

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
- `favorites` — customerId + businessId (customer saved restaurants)
- `driver_reports` — driverId, orderId, reason, notes, status (driver flags problems mid-delivery)
- `disputes` — orderId, customerId, reason, description, status, refundAmount, adminNotes, resolvedById
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
