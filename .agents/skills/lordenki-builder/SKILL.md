---
name: lordenki-builder
description: Personal playbook for LordEnki7's app projects. Load this skill at the start of any new project or session to carry forward brand identity, tech stack preferences, architecture patterns, business logic, UI conventions, and communication style built across all previous apps. Use whenever starting a new app, adding a feature, or needing context about how this user likes to build.
---

# LordEnki Builder Playbook

This skill captures everything learned building apps with LordEnki7 (GitHub: @LordEnki7). Load it at the start of any session to avoid repeating decisions already made.

---

## Who LordEnki Is

- Building real businesses targeting the **Dominican Republic (DR) market**
- Thinks in features and outcomes, not code — explain what you're doing in plain language
- Moves fast; prefers building over planning
- Wants apps that go on **App Store + Google Play** (has a Mac for iOS builds + Android Studio)
- GitHub: `https://github.com/LordEnki7/` — always push code there when done
- Contact email used in apps: `info@yapide.app`

---

## Communication Style

- Speak in **plain, everyday English** — no jargon
- Be direct and confident; don't ask for permission on technical decisions
- When something is complex, briefly explain *why* before diving in
- Keep summaries short — bullet points over paragraphs
- Never show code unless he specifically asks to see it

---

## Flagship App: YaPide

**What it is:** Dominican delivery app (like Uber Eats for the DR). Live at `yapide.app`.

| Property | Value |
|----------|-------|
| App ID | `app.yapide` |
| GitHub repo | `https://github.com/LordEnki7/yapide` |
| Contact email | `info@yapide.app` |
| Primary language | Spanish (ES), secondary English (EN) |
| Market | Dominican Republic — 5 cities |
| Tagline | "Entrega rápida y económica." |

**YaPide brand:**
- Navy background: `#040f26` (HSL: `228 83% 9%`)
- Electric yellow: `#FFD700`
- White text on dark bg
- Logo: `/public/logo.png` — motorcycle with lightning bolt, transparent PNG
- UI style: dark mobile-first, rounded cards, bold yellow accents, `font-black` headings

**YaPide roles:** customer · driver · business · admin (admin login is URL-only: `/admin`)

**YaPide business logic:**
- Currency: Dominican Peso → formatted as `RD$ 1,200` using `formatDOP()`
- 15% markup on all product prices (business gets base, platform keeps 15%)
- Delivery fee: RD$150 base + RD$25/km, split 50/50 platform/driver
- Tips: 100% to driver
- Driver cash limit: warn >8,000 DOP, lock >10,000 DOP
- Milestone bonuses: every 10 deliveries (RD$300 at 10, RD$800 at 20+)
- Points: 1 point per RD$10 spent (base price, pre-markup)
- Exchange rates (hardcoded approximations): 1 USD = 60 DOP, 1 EUR = 65 DOP

**Key YaPide features built:**
- Splash screen (sessionStorage, shows once per session)
- Phone + PIN login (in addition to email/password)
- 4-digit delivery verification PIN (customer shows to driver at delivery)
- Cash change calculator modal (DOP/USD/EUR currency tabs)
- Cutlery prompt (food orders only)
- Live driver map (Leaflet + Nominatim geocoding)
- Driver GPS tracking every 10s while picked_up
- Audio job alert (Web Speech API in es-DO) with mute toggle
- WhatsApp deep links for customer↔business/driver chat
- Web Push notifications (VAPID)
- Proof of delivery photo upload
- Promo codes system
- Loyalty points system
- Business analytics dashboard
- Driver wallet with milestone bonuses
- Capacitor iOS + Android setup (bundle ID: `app.yapide`, webDir: `dist/public`)

**YaPide demo credentials:**
- customer@qlq.do / password123
- driver@qlq.do / password123
- business@qlq.do / password123
- admin@qlq.do / password123

---

## Preferred Tech Stack

This is the stack LordEnki has used and is comfortable with. Default to it for new apps unless he says otherwise.

| Layer | Technology |
|-------|-----------|
| Monorepo | pnpm workspaces |
| Language | TypeScript (strict) |
| Node | v24 |
| API | Express 5 |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod (import from `@workspace/api-zod`, never `zod/v4` directly) |
| API codegen | Orval (OpenAPI → typed hooks) |
| Frontend | React + Vite + Tailwind CSS v4 |
| UI components | shadcn/ui |
| Routing | wouter |
| Data fetching | TanStack Query v5 |
| Auth | express-session (session-based), user stored in localStorage |
| Mobile | Capacitor (wraps web app for App Store / Play Store) |
| Push | Web Push API (VAPID) |
| Maps | Leaflet + OpenStreetMap + Nominatim |
| Object storage | Replit Object Storage |

---

## Architecture Patterns

### Monorepo structure
```
artifacts/que-lo-que/   ← React/Vite frontend
artifacts/api-server/   ← Express API backend
lib/db/                 ← Drizzle schema + migrations
lib/api-spec/           ← OpenAPI spec
lib/api-client-react/   ← Auto-generated hooks (via Orval)
lib/api-zod/            ← Auto-generated Zod schemas
```

### Key commands
```bash
pnpm --filter @workspace/api-spec run codegen   # regenerate API hooks after spec changes
cd lib/db && pnpm run push                       # push DB schema to dev database
pnpm run typecheck                               # typecheck all packages
```

### Auth pattern
- Session-based: `credentials: "include"` on every fetch
- User object stored in localStorage under key `qlq_user`
- Helpers: `getStoredUser()`, `setStoredUser()`, `clearStoredUser()` from `lib/auth.ts`
- Admin pages always use `useAdminLang()` (always EN)

### API hook pattern (TanStack Query v5)
```typescript
// Always pass queryKey when using hooks
useListBusinesses(params, { query: { queryKey: getListBusinessesQueryKey(params) } })
useAdminListUsers(params, { query: { queryKey: getAdminListUsersQueryKey() } })
```

### DB schema pattern
```typescript
// Always use this import for Zod in db schema files
import { z } from "zod/v4";
// Run after schema change:
cd lib/db && pnpm run push
```

### GitHub push pattern
```bash
# Use GITHUB_TOKEN secret — do NOT use plain `git push` (Replit intercepts)
git remote add origin "https://x-access-token:${GITHUB_TOKEN}@github.com/LordEnki7/REPO.git"
git push -u origin main --force
```

---

## UI/UX Conventions

### Dark mobile-first design
- Background: `bg-background` (navy `#040f26`)
- Cards: `bg-white/8 border border-white/10 rounded-2xl p-4`
- Headings: `font-black text-white`
- Subtext: `text-gray-400 text-sm`
- Primary accent: `text-yellow-400`, `bg-yellow-400`, `border-yellow-400`
- Success: `text-green-400`
- Error: `text-red-400`
- Buttons: `rounded-2xl h-14` for primary actions (thumb-friendly)
- Modals/dialogs: white card (`bg-white rounded-2xl`) on dark overlay (`bg-black/60 backdrop-blur-sm`)
- iOS-style dialog buttons: blue text `text-blue-500`, divider `border-gray-100`

### Component patterns
- Confirmation modals (change calculator, cutlery, PIN): white card, centered, Cancel|OK footer
- Status badges: colored bg with matching border, small text
- Loading states: `Skeleton` component or `Loader2` spinner
- Toast notifications: use `useToast()` hook
- Bottom navigation: role-aware, always present after login

### i18n
- Default language: Spanish
- `useLang()` hook returns `t` (translation object) and `lang`
- `LangToggle` component for switching
- Admin always English via `useAdminLang()`

---

## Mobile / App Store Setup

When building a new app that will go on App Store + Google Play:

1. Install Capacitor: `pnpm add @capacitor/core && pnpm add -D @capacitor/cli @capacitor/ios @capacitor/android @capacitor/splash-screen @capacitor/status-bar @capacitor/app`
2. Create `capacitor.config.ts` with `appId`, `appName`, `webDir`
3. Run `npx cap add ios && npx cap add android`
4. Run icon generator: `node scripts/generate-icons.mjs` (uses `sharp`, generates all sizes from `public/logo.png`)
5. Set `VITE_API_URL` in `.env.production` to deployed API URL before building
6. iOS build requires Mac + Xcode; Android build uses Android Studio (LordEnki has both)

---

## Dominican Republic Market Context

- Language: Spanish (DR dialect) — use natural DR slang where appropriate
- Currency: Dominican Peso (DOP), display as `RD$ 1,200`
- Cities served: Santo Domingo, Santiago, San Pedro de Macorís, La Romana, Puerto Plata
- Payment: mostly cash (DOP), also USD and EUR accepted
- WhatsApp is the dominant communication channel — always add WhatsApp deep links
- Business approval flows needed (drivers + businesses require admin approval)
- Common categories: food, supermarket, pharmacy, liquor

---

## Security & Safety Patterns

- Delivery verification: 4-digit PIN generated on order creation, shown to customer, required from driver
- Admin routes: always check `user.role === "admin"` server-side
- Driver cash limit enforcement: auto-lock when cashBalance > 10,000 DOP
- Server-side ownership checks on all customer mutations (cancel, edit notes, etc.)
- PIN login uses bcrypt hash stored in `pinHash` column

---

## What NOT to Do

- Don't import `zod/v4` directly — use `@workspace/api-zod`
- Don't use `npm` or `yarn` — always `pnpm`
- Don't hardcode localhost URLs — use relative paths in dev, `VITE_API_URL` in production
- Don't show the admin login link on the landing page — it's URL-only (`/admin`)
- Don't change primary key ID column types (serial ↔ varchar) — destructive
- Don't create README or docs files unless explicitly asked
