# DoctA / ClinicBook — Agent Instructions

## Quick start

```bash
bun install
# .env: DATABASE_URL=file:./db/custom.db  (NOT absolute path)
bun run db:push     # push schema to SQLite
bunx prisma db seed # demo data: 6 clinics, 6 providers, 768 slots, 13 staff users
bun run dev         # port 3000
```

Demo staff login credentials on `/staff/login`.

## DB & schema gotchas

- **SQLite** — no native ENUMs. All enum fields are `String` in Prisma; validated at runtime by `src/lib/enums.ts`. Always use the constant objects, never raw strings.
- **`.env`** — initial clone has an absolute path; change to `file:./db/custom.db`.
- **DB file is committed** at `db/custom.db`. `db:push` modifies it in-place; `db:reset` destroys it.
- Prisma singleton: `src/lib/db.ts` — always import `db` from there.

## Commands

| Purpose | Command |
|---------|---------|
| Dev server | `bun run dev` (logs to `dev.log`) |
| Lint | `bun run lint` (ESLint — nearly all rules off, treat as advisory) |
| Push schema | `bun run db:push` |
| Migrate | `bun run db:migrate` |
| Reset DB | `bun run db:reset` (destructive) |
| Generate client | `bun run db:generate` |
| Seed | `bunx prisma db seed` |
| Build | `bun run build` (standalone) |
| Full dev cycle | `.zscripts/dev.sh` |

## Framework quirks

- **Next.js 16 App Router** with RSC for public pages, Client Components for dashboards.
- **`next.config.ts`**: `typescript.ignoreBuildErrors: true`, `reactStrictMode: false`. Build succeeds with TS errors; runtime bugs may slip. **Verify business logic manually.**
- **Tailwind CSS v4** — uses `@import "tailwindcss"` in CSS, not legacy `@tailwind` directives. Use `@theme` for custom values.
- **shadcn/ui New York** — 45+ primitives in `src/components/ui/`. Add via `bunx shadcn@latest add <component>`.
- **Path alias**: `@/*` → `./src/*`.
- **Middleware** runs on Edge Runtime (`src/middleware.ts`). Prisma queries are NOT available there — use `next-auth/jwt` `getToken()` for auth. Known cosmetic "middleware deprecation" warning in Next.js 16 logs.
- **No React Strict Mode** (`reactStrictMode: false`) — intentional. Side effects in dev may behave differently.

## Auth & RBAC

- **NextAuth v4 JWT strategy** — stateless, 30-day expiry. No DB session table.
- **Three roles** (hierarchical): `CLINIC_RECEPTION` < `CLINIC_ADMIN` < `SYSTEM_MANAGER`. Check via `hasMinimumRole()` from `src/lib/enums.ts`.
- Middleware injects `x-user-id`, `x-user-role`, `x-clinic-id` headers for API route re-validation.
- **Patient token flow** (no accounts): tokens via `crypto.randomBytes(32)`, stored as SHA-256 hash, verified with `timingSafeEqual`.

## Booking system

- **Two-phase lock**: `POST /api/slots/[id]/lock` → fill form → `POST /api/appointments`. `SlotLock.slotId` unique constraint prevents double-booking.
- **Staff manual booking** bypasses locks — `POST /api/staff/book` in a single transaction with `CASH_AT_DESK`.
- **No Stripe** — SDK not installed. All bookings use `MANUAL_WAIVER` or `CASH_AT_DESK`.

## Architecture gaps

- **In-memory cache** (`src/lib/cache.ts`) with TTL, prefix/tag invalidation — single instance only.
- **No background jobs** — slot generation is seed-only. No lock sweeping, waitlist processing, or email dispatch.
- **No email service** — token URLs are generated but never delivered.
- **Error buffer** (`src/lib/error-buffer.ts`) — in-memory ring buffer, max 100 entries, lost on restart.

## API conventions

- Public routes: no auth. Staff routes: auth via `getServerSession(authOptions)`, scoped to `session.user.clinicId`.
- SYSTEM_MANAGER has cross-clinic access (no `clinicId` constraint). Pass `?clinicId=` query param to scope queries.
- Cache invalidation: staff mutation endpoints call `cache.deleteByPrefix()` for `slots:` and `search:` keys.
- **Audit logging**: `createAuditLog()` from `src/lib/audit.ts` — fire-and-forget, never throws. Actions defined in `AUDIT_ACTIONS` in `src/lib/constants.ts`.
- **Middleware session headers**: all staff API routes can read `x-user-id`, `x-user-role`, `x-clinic-id` for re-validation.

## Seed data

- Run with `bunx prisma db seed`. Idempotent — FK-safe deletion order.
- 6 NYC clinics, 6 providers, 5 specialties, 10 services, 3 insurances, 768 slots (14 days), 5 reviews, 13 staff users.
- Slot templates are Mon–Fri only. Weekend dashboards appear empty.
- Destroys and recreates seed data while preserving any production records outside seed scope.
- `Service.isBookable` field exists — controls whether a service appears in public booking.
- `SystemConfig.reviewWindowDays` field exists — controls how many days post-appointment patients can submit reviews.
- Taxonomy archiving: specialty/service/insurance use soft-delete (`isActive=false`); amenity/language use hard-delete.

## System Manager Dashboard

Built as sub-pages under `/staff/dashboard/admin/` with 8-tab layout. All API routes enforce `SYSTEM_MANAGER` role.

| Tab | Key API |
|-----|---------|
| Overview | `GET /api/staff/admin` — platform stats, clinic summary, activity, staff list |
| Configuration | `GET/PUT /api/staff/admin/system-config` — deposit bounds, lock TTL, slot window, $0 deposit toggle, waitlist delay, review window, platform fee |
| Taxonomies | `GET/POST /api/staff/admin/taxonomies`, `PUT/DELETE /api/staff/admin/taxonomies/[type]/[id]`, `GET/PUT /api/staff/admin/services/[id]/copays` — 5 taxonomy types, copay matrix |
| Clinics | `PATCH /api/staff/admin/clinics/[id]/status` (transition validation), `GET /api/staff/admin/providers` — status management + provider table |
| Appointments | `GET /api/staff/admin/appointments` (search, filter, paginate, token lookup), `POST /api/staff/admin/refunds` — cross-clinic search + waitlist + refund dialog |
| Audit Logs | `GET /api/staff/admin/audit-logs` (filters, pagination, CSV export), `GET/DELETE /api/staff/admin/error-logs` |
| Analytics | `GET /api/staff/admin/analytics?period=7d\|30d\|90d` — daily volume, modality split, conversion, deposit capture, busiest day |
| Infrastructure | `POST /api/staff/admin/cache/purge`, `POST /api/staff/admin/seed` — cache management, seed regen, background job monitoring |

### Staff invite
SYSTEM_MANAGER can create other SYSTEM_MANAGER accounts via the Overview page dialog (calls `POST /api/staff/staff`).

## Build & deploy

- Production build: `bun run build` → `.next/standalone/`. The build command also copies `.next/static` and `public/` into the standalone output.
- Start via `.next/standalone/server.js` in production with `NODE_ENV=production`.
- Full deployment script: `.zscripts/build.sh` — runs install, build, copies output + DB + Caddyfile to `/tmp/`, tars it.
- DB file is expected at `./db/custom.db` for production builds.
