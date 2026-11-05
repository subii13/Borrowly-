# Architecture

Borrowly is a **modular monolith** built on Next.js 16 (App Router). One deployable unit and one PostgreSQL database. The domain logic is kept in framework-independent modules, so it can be tested directly and moved behind another transport later.

```
Browser ──► Next.js (Vercel / node)
              ├─ proxy.ts                  optimistic redirect for private areas (UX only)
              ├─ app/ pages (RSC)          read models, render HTML on the server
              ├─ app/actions/*  (Server Actions)  ─┐
              ├─ app/api/*      (Route Handlers)  ─┤──► src/modules/* (domain services)
              │                                    │        └─► Prisma ──► PostgreSQL
              └─ lib/ (auth, permissions, storage, errors, validation, money, dates)
                                                   └──► Storage adapter: local disk | Supabase Storage
                                                   └──► Payment provider: DemoPaymentProvider
```

## Layers

| Layer | Location | Responsibility |
| --- | --- | --- |
| Pages | `src/app/**/page.tsx` | Server components. Load data with Prisma, enforce page access (`requireUserPage`, `requireSellerPage`, `requireAdminPage`), render. |
| Server actions | `src/app/actions/*.ts` | Thin adapters: resolve the **actor from the session**, rate-limit, call a module, map errors to a safe `ActionResult`. |
| API routes | `src/app/api/**/route.ts` | JSON endpoints used by client components and integrations. |
| Domain modules | `src/modules/*` | Business rules and transactions. Each function takes `(db, actor, input)`. No `next/*` imports, so they are unit and integration testable. |
| Library | `src/lib/*` | Cross-cutting concerns: session auth, permission helpers, Zod schemas, money (paise) and date (half-open) maths, safe errors, rate limiting, storage adapter. |
| Components | `src/components/*` | `ui/` primitives, `layout/`, `marketplace/`, `product/`, `orders/`, `forms/`, `admin/`, `charts/`. |

## Modules

| Module | Key functions |
| --- | --- |
| `auth` | `registerUser`, `authenticate`, `verifyEmail`, `requestPasswordReset`, `resetPassword`, `changePassword` |
| `sellers` | `becomeSeller`, `updateSellerProfile`, `requestPhoneOtp`, `verifyPhoneOtp`, `submitVerification`, `reviewSeller` |
| `listings` | `createListing`, `updateListing`, `setListingStatus`, `moderateListing`, `toggleFavourite`, `searchListings`, `suggestions` |
| `rentals` | `quoteRental`, `createHold`, `releaseHold`, `expireHolds`, `checkoutRental`, `sellerRespond`, `cancelBooking`, `confirmRentalStep`; `availability.ts` has the overlap and peak-reservation maths |
| `purchases` | `quotePurchase`, `checkoutPurchase`, `acceptOrder`, `cancelOrder`, `confirmPurchaseHandover` |
| `payments` | `PaymentProvider` interface, `DemoPaymentProvider` |
| `pricing` | Pure functions: `rentalQuote`, `purchaseQuote`, `lateFee` |
| `handovers` | Append-only `addEvidence`, audited `correctEvidence`, authorised `evidencePhotoKey` |
| `reviews` | `createReview` (completed transactions only, one per transaction) |
| `disputes` | `createDispute`, `addDisputeNote`, `startDisputeReview`, `resolveDispute`, `processRefund` |
| `admin` | `setUserStatus`, `updateSettings` |
| `reports` | Read models: `sellerOverview`, `platformOverview`, `earningsByMonth`, `categoryPerformance` |
| `platform` | `getSettings` (configurable commission and fees), `audit`, `notify`, `sendDevMessage` |
| `demo` | `catalogue.ts` (sample data) and `seedDemo` / `wipe` |

## Key flows

### Rental checkout

1. Client fetches `/api/listings/:id/availability` (per-day free units) and `/api/listings/:id/quote` (server-calculated price).
2. `createHoldAction` → `createHold`: inside a transaction, `SELECT … FOR UPDATE` on the listing row, release the customer's previous holds, compute available stock, insert a `BookingHold` (expires after `holdMinutes`).
3. The checkout page renders an **idempotency key** generated on the server.
4. `payRentalAction` → `checkoutRental`:
   - **Transaction 1:** lock the listing, check for a racing request with the same key, revalidate the hold and stock, compute the quote, create the `RentalBooking` (`PENDING_PAYMENT`) and a `Payment` (`PENDING`).
   - Call `PaymentProvider.charge()` **after** the booking exists.
   - **Transaction 2:** `SUCCESS` → booking `REQUESTED`, notify the seller. `FAILED` → booking `PAYMENT_FAILED` (stops blocking stock).
5. Seller confirms. Both parties confirm handover (→ `ACTIVE`), then return (→ `COMPLETED`, deposit-return refund recorded, late fee kept if overdue).

### Purchase checkout

Same two-phase pattern. Inside the locked transaction the stock is decremented immediately (→ `SOLD_OUT` at 0) after checking that units are not needed for future rentals. On a declined payment or a cancellation the unit is restocked.

## API surface

| Method & path | Auth | Purpose |
| --- | --- | --- |
| `GET /api/health` | public | DB connectivity and storage mode |
| `GET /api/listings?q&category&area&condition&mode&min&max&sort&page` | public | Search (JSON) |
| `GET /api/search/suggest?q` | public | Typeahead suggestions |
| `GET /api/listings/:id/availability?from&days` | public | Per-day free units |
| `GET /api/listings/:id/quote?start&end&qty` | public | Server-side rental quote |
| `POST /api/uploads` (multipart: `file`, `scope`) | session | Validated image upload → storage key |
| `GET /api/media/:key*` | public | Serve public uploads (local storage mode) |
| `GET /api/evidence/:id[?kind=dispute]` | transaction party / admin | Private evidence photos |

All other mutations are **Server Actions** (`src/app/actions/*`). Next.js checks the request origin on every Server Action, and each action re-derives the actor from the session cookie.

## Error handling

Domain code throws `AppError(code, safeMessage)`. `runAction` and `toSafeError` convert it into a typed `ActionResult`. Zod errors become field errors. Unknown errors are logged on the server and returned as a generic message. Next's `redirect`/`notFound` control-flow errors are re-thrown.

## Rendering and assets

- All marketplace pages are server-rendered on demand (they read live data). Client components cover the interactive parts: calendar, filters, search typeahead, wizard, uploads and action buttons.
- Images use `next/image` (AVIF/WebP, responsive `sizes`, lazy by default) with a fallback placeholder. Demo photos are stored in `public/images/` as consistent 4:3 WebP files. Seller uploads are re-encoded to WebP and stored through the storage adapter.

## Folder map

```
prisma/              schema.prisma, migrations/, seed.ts
scripts/             db-local.ts (embedded Postgres), fetch-images.ts, image-manifest.ts, contact-sheet.ts
public/images/       categories/, products/, branding/, credits.json
src/app/             (marketplace)/ (auth)/ account/ seller/ admin/ api/ actions/
src/modules/         auth sellers listings rentals purchases payments pricing handovers reviews disputes admin reports platform demo
src/components/      ui layout marketplace product orders forms admin charts
src/lib/             db auth session permissions validation errors money dates storage rate-limit env crypto constants password
tests/               unit/ integration/ e2e/ support/
```
