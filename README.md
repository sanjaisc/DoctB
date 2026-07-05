# ClinicBook

A modern, full-featured medical clinic directory and appointment booking platform. Inspired by Zocdoc, built with Next.js 16, TypeScript, and SQLite.

## Overview

ClinicBook enables patients to search for medical providers by specialty, location, insurance, and modality, then book appointments online through a secure two-phase slot-locking system. Clinic staff manage schedules, patients, and appointments through a role-based dashboard.

### Key Features

- **Provider Search** — Filter by specialty, patient type, insurance, modality, and location (Haversine distance)
- **Two-Phase Slot Locking** — Atomic ACQUIRE → BOOK → RELEASE flow prevents double-booking
- **Anonymous Patient Tokens** — Patients receive secure, single-purpose tokens (intake, review, manage, check-in) — no accounts required
- **Role-Based Staff Dashboard** — Three-tier RBAC: Clinic Reception → Clinic Admin → System Manager
- **Waitlist System** — Automatic matching when cancelled slots become available
- **Clinic/Provider Profiles** — Detailed pages with reviews, ratings, insurance acceptance, and amenities
- **QR Code Check-In** — Patients scan a QR code to check in for their appointment
- **Comprehensive Audit Trail** — All critical actions logged with actor, target, and IP hash
- **In-Memory Caching** — TTL-based cache with prefix/tag invalidation (drop-in Redis replacement)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Database | SQLite via Prisma ORM 6 |
| Auth | NextAuth v4 (JWT strategy) |
| State | Zustand (client) + TanStack Query (server) |
| Validation | Zod 4 + React Hook Form 7 |
| Icons | Lucide React |
| Animations | Framer Motion 12 |
| Charts | Recharts 2 |
| Runtime | Bun |

## Project Structure

```
src/
├── app/                          # Next.js App Router pages & API routes
│   ├── api/                      # 28 API route handlers
│   │   ├── auth/[...nextauth]/   # NextAuth credentials handler
│   │   ├── search/providers/     # Public provider search with caching
│   │   ├── appointments/         # Public booking endpoint
│   │   ├── slots/[slotId]/       # Slot lock acquire/release
│   │   ├── staff/                # Protected staff APIs (dashboard, book, calendar, etc.)
│   │   ├── taxonomies/           # Reference data (specialties, insurances)
│   │   ├── waitlist/             # Public waitlist join
│   │   ├── reviews/              # Review submission
│   │   ├── intake/               # Patient intake form
│   │   ├── qr/                   # QR code generation
│   │   └── admin/                # System admin (lock cleanup, slot generation)
│   ├── staff/dashboard/          # Staff dashboard pages (9 sub-pages)
│   ├── book/                     # Patient booking wizard
│   ├── clinic/[slug]/            # Clinic detail page
│   ├── providers/[slug]/         # Provider profile page
│   ├── intake/[token]/           # Token-gated intake form
│   ├── manage/[token]/           # Token-gated appointment management
│   ├── review/[token]/           # Token-gated review submission
│   ├── clinics/                  # Clinic directory listing
│   ├── about/                    # About page
│   └── insurance/                # Insurance information page
├── components/
│   ├── ui/                       # 45 shadcn/ui primitives
│   ├── search/                   # SearchPage + ProviderCard
│   ├── clinic/                   # ClinicProviderRow + AboutText
│   ├── providers.tsx             # Client-side providers wrapper
│   ├── public-footer.tsx         # Site-wide footer
│   ├── notification-bell.tsx     # Staff notification bell
│   ├── qr-code-display.tsx       # QR code component
│   └── theme-toggle.tsx          # Dark/light mode toggle
├── lib/
│   ├── db.ts                     # Prisma client singleton
│   ├── auth.ts                   # NextAuth v4 configuration
│   ├── crypto.ts                 # bcrypt passwords, SHA-256 tokens, IP hashing
│   ├── cache.ts                  # In-memory cache with TTL & tag invalidation
│   ├── enums.ts                  # Type-safe enum constants (26 enums)
│   ├── constants.ts              # Audit actions, search params, cookie names
│   ├── audit.ts                  # Audit logging utility
│   ├── geo.ts                    # Haversine distance, bounding box, formatters
│   └── utils.ts                  # General utilities (cn, etc.)
├── types/
│   └── next-auth.d.ts            # NextAuth JWT/Session type augmentation
├── hooks/
│   ├── use-toast.ts              # Toast notification hook
│   └── use-mobile.ts             # Mobile viewport detection
└── middleware.ts                  # Edge Runtime: staff RBAC + clinic status checks

prisma/
├── schema.prisma                 # 26 models, 5 junction tables, 14 indexes
└── seed.ts                       # Demo data (6 clinics, 6 providers, 768 slots)

db/
└── custom.db                     # SQLite database file
```

## Getting Started

### Prerequisites

- **Bun** 1.3+ (runtime & package manager)
- **Node.js** 18+ (for Next.js / Prisma tooling)

### Installation

```bash
# Clone the repository
git clone <repo-url> clinicbook
cd clinicbook

# Install dependencies
bun install

# Copy environment variables
cp .env.example .env
# Edit .env with your values (see Environment Variables below)

# Initialize the database
bun run db:push

# Seed demo data (optional — creates 6 clinics, providers, slots)
bunx prisma db seed

# Start development server
bun run dev
```

The app runs on **http://localhost:3000**.

### Common Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server (port 3000) |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push Prisma schema to SQLite |
| `bun run db:generate` | Regenerate Prisma client |
| `bun run db:reset` | Reset database (destructive) |
| `bun run build` | Production build (standalone output) |
| `bun run start` | Start production server |

## Database Schema

The Prisma schema defines **26 models** organized into 6 domains:

| Domain | Models |
|--------|--------|
| **System** | SystemConfig, AuditLog |
| **Taxonomy** | Specialty, Service, Insurance, Amenity |
| **Clinic** | Clinic, ClinicInsurance, ClinicAmenity |
| **Provider** | Provider, ProviderService, ProviderAvailability |
| **Scheduling** | Slot, SlotTemplate, SlotLock |
| **Booking** | Appointment, Payment, Refund, Ledger, Token, WaitlistEntry |
| **Feedback** | Review |
| **Auth** | User (staff accounts) |

Key design decisions:
- **SQLite** — zero-ops, single-file database. Suitable for single-instance deployments.
- **String enums** — SQLite lacks native ENUM support; all enum fields validated at the application layer via `src/lib/enums.ts`.
- **Singleton SystemConfig** — enforced to one row by application logic; stores global settings (deposit limits, lock TTL, slot generation window).
- **Two-Phase Locking** — `SlotLock` table with unique constraint on `slotId` prevents concurrent double-booking. Locks expire after a configurable TTL (default: 10 minutes).

## Authentication & Authorization

### Staff Auth (NextAuth v4 JWT)

- **Strategy**: Stateless JWT (no DB session table)
- **Provider**: Credentials (email + password)
- **Token lifetime**: 30 days
- **Password hashing**: bcrypt (12 rounds)
- **Clinic status enforcement**: Staff of suspended clinics cannot log in

### Role-Based Access Control (RBAC)

Three roles with hierarchical inheritance:

| Role | Level | Access |
|------|-------|--------|
| `CLINIC_RECEPTION` | 1 | Dashboard, appointments, calendar, activity, analytics, slots, manual booking |
| `CLINIC_ADMIN` | 2 | Above + settings, providers, templates, communications |
| `SYSTEM_MANAGER` | 3 | Above + system config, clinic management (cross-clinic access) |

Role checks use `hasMinimumRole(userRole, requiredRole)` from `src/lib/enums.ts`. Middleware enforces route-level access; API routes re-validate via `x-*` headers injected by middleware.

### Patient Token Flow (No Accounts)

Patients never create accounts. Instead, each appointment generates purpose-specific tokens:

1. **INTAKE** — Pre-appointment health questionnaire
2. **MANAGE** — Reschedule/cancel appointment
3. **REVIEW** — Post-appointment provider review
4. **CHECK_IN** — QR code check-in

Tokens are 256-bit random values (`crypto.randomBytes(32)`), stored as SHA-256 hashes, and verified with `crypto.timingSafeEqual`.

## Booking Flow

### Public Booking (Two-Phase Lock)

```
1. Patient selects a slot on search/clinic page
2. POST /api/slots/[slotId]/lock  → ACQUIRE lock (atomic transaction)
   - Checks slot is AVAILABLE and in the future
   - Creates SlotLock (unique constraint prevents races)
   - Sets slot status to LOCKED
3. Patient fills booking form (patient details, reason, insurance)
4. POST /api/appointments         → CONFIRM booking (atomic transaction)
   - Verifies lock exists and lockKey matches
   - Creates Appointment + Payment/Ledger records
   - Deletes SlotLock, sets slot to BOOKED
   - Generates patient tokens (intake, manage, review, check-in)
5. (Optional) DELETE /api/slots/[slotId]/lock → RELEASE lock
   - If patient abandons, lock expires after TTL or is cleaned up
```

### Staff Manual Booking

Staff bypass the lock mechanism entirely — `POST /api/staff/book` checks slot availability and books directly in a single transaction. Payment method is `CASH_AT_DESK`.

## API Routes

### Public (No Auth)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/taxonomies` | Specialties, insurances, services |
| GET | `/api/search/providers` | Provider search with filters & pagination |
| GET | `/api/clinics` | Clinic directory listing |
| GET | `/api/providers/[id]/reviews` | Provider reviews |
| POST | `/api/reviews` | Submit a review (token-gated) |
| POST | `/api/waitlist` | Join waitlist |
| POST | `/api/appointments` | Book an appointment (lock-gated) |
| POST | `/api/slots/[slotId]/lock` | Acquire a slot lock |
| DELETE | `/api/slots/[slotId]/lock` | Release a slot lock |
| GET | `/api/qr/[appointmentId]` | Generate QR code |
| POST | `/api/intake` | Submit intake form (token-gated) |
| PATCH | `/api/manage` | Manage appointment (token-gated) |

### Staff (Auth Required)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/staff/dashboard` | Dashboard statistics |
| GET | `/api/staff/calendar` | Calendar data |
| POST | `/api/staff/book` | Manual booking (phone/in-person) |
| GET | `/api/staff/appointments` | Appointments list |
| GET | `/api/staff/appointments/[id]` | Appointment detail |
| POST | `/api/staff/appointments/[id]/notes` | Add internal notes |
| GET | `/api/staff/slots` | Slot management |
| GET | `/api/staff/notifications` | Staff notifications |
| GET | `/api/staff/waitlist` | Waitlist management |
| GET | `/api/staff/clinic-info` | Current clinic info |
| GET | `/api/staff/analytics` | Analytics data |
| POST | `/api/staff/admin` | Admin operations |

### System Admin

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/admin/locks/cleanup` | Clean expired slot locks |
| POST | `/api/admin/slots/generate` | Batch slot generation |

## Security

| Area | Implementation |
|------|---------------|
| Password storage | bcrypt (12 rounds) |
| Token generation | `crypto.randomBytes(32)` — 256-bit entropy |
| Token storage | SHA-256 hash only (raw token never persisted) |
| Token verification | `crypto.timingSafeEqual` (constant-time comparison) |
| Lock key comparison | `crypto.timingSafeEqual` (Phase 2 audit fix) |
| Lock cleanup | Transactional — each lock released in its own `$transaction` (Phase 2 audit fix) |
| JWT | Stateless, 30-day expiry, role/clinicId injection |
| Middleware | Edge Runtime RBAC enforcement, header injection |
| IP storage | SHA-256 hashed with server salt |
| User enumeration | Login returns null for all failures (no "user not found" vs "wrong password") |

## Caching

In-memory cache (`src/lib/cache.ts`) with:

- **TTL**: Per-key expiration (default: 180s search, 300s clinic, 120s slots, 3600s config)
- **Prefix deletion**: `cache.deleteByPrefix("slots:provider:123:")` — invalidates all slots for a provider
- **Tag deletion**: `cache.deleteByTag("clinic-abc")` — convention-based tag invalidation
- **Factory pattern**: `cache.getOrSet(key, factory, ttl)` — atomic get-or-compute
- **Auto-cleanup**: Background interval purges expired entries every 60s

> **Note**: This cache is single-instance only. For multi-instance deployments, replace with Redis.

## Environment Variables

See [`.env.example`](.env.example) for all required and optional variables.

## Audit History

| Phase | Scope | Result |
|-------|-------|--------|
| Phase 1 | Compile & Route | 130 TS errors → 0, 8 root causes identified & fixed |
| Phase 2 | Business Logic & Security | 4 security fixes (lock cleanup transactions, timing-safe lock key comparison, notification audit fix, search params validation) |
| Phase 3 | Loading/Error States | Deferred — no new features per audit constraint |
| Phase 4 | Documentation | README.md, .env.example, Stripe setup guide created |

## Known Limitations

1. **SQLite single-instance** — No multi-server horizontal scaling. Prisma with PostgreSQL is supported by the schema but requires migration.
2. **Stripe not implemented** — Data model and enums are prepared for Stripe integration (PaymentIntent, deposits, refunds, ledger) but no SDK calls or webhook handlers exist yet.
3. **In-memory cache** — Not shared across instances. Replace with Redis for multi-node deployments.
4. **No geolocation API** — Distance search requires manual latitude/longitude entry; browser geolocation not yet wired to the search UI.
5. **Seed data is NYC-only** — 6 clinics in the New York City area with 768 pre-generated slots.
6. **No email delivery** — Token URLs (intake, manage, review) are generated server-side but no email service is configured to deliver them.
7. **Lock TTL is per-process** — In a multi-process deployment, lock cleanup must be coordinated externally.

## License

Private / Proprietary