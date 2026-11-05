# Database design

PostgreSQL is the single source of truth (no localStorage persistence), managed through Prisma 6. The schema lives in `prisma/schema.prisma`, with migrations in `prisma/migrations/`.

## Conventions

- IDs are `cuid()` strings. Human-friendly references (`BR-XXXXXX` bookings, `BO-` orders, `DS-` disputes) are unique columns.
- **Money is integer paise** (`Int`). Rates are basis points (`commissionBps`, `customerFeeBps`). No floats anywhere in money paths.
- Rental dates are `DATE` columns meaning the **half-open interval `[startDate, endDate)`**.
- Seeded rows carry `isDemo = true` (users, listings, bookings, orders, reviews, disputes).
- Every table has `createdAt`, and mutable tables have `updatedAt`.

## Entities

| Model | Purpose | Notable fields and constraints |
| --- | --- | --- |
| `User` | Account (customer, and seller via profile) | `email` unique, `passwordHash` (bcrypt), `role` CUSTOMER/ADMIN, `status`, `emailVerifiedAt` |
| `UserProfile` | Optional contact details | 1:1 with user |
| `Session` | Server-side sessions | `tokenHash` unique (SHA-256 of cookie token), `expiresAt` index |
| `VerificationToken` | Email verify, password reset, phone OTP | `tokenHash` unique, `type`, `expiresAt`, `usedAt` |
| `DevMessage` | Development email/SMS outbox | |
| `SellerProfile` | Seller capability for a user | `userId` unique, `verificationStatus` (NOT_SUBMITTED/PENDING/VERIFIED/REJECTED/SUSPENDED), private `pickupAddress`, `ratingSum`/`ratingCount` |
| `Category` | 9 categories | `slug` unique |
| `Listing` | Item for rent and/or sale | `rentalEnabled`, `purchaseEnabled`, `dailyRatePaise`, `depositPaise`, `salePricePaise`, `stockQuantity` (CHECK ≥ 0), `min/maxRentalDays`, `status` DRAFT/ACTIVE/INACTIVE/SOLD_OUT/SUSPENDED |
| `ListingImage` | Ordered gallery | cascade on listing delete |
| `Favourite` | Saved listings | composite PK `(userId, listingId)` |
| `BookingHold` | Short checkout reservation | `status` ACTIVE/CONVERTED/RELEASED, `expiresAt`. Blocks stock only while ACTIVE and unexpired |
| `RentalBooking` | Rental transaction | `idempotencyKey` unique, `holdId` unique, snapshot of all price components and rates, `status`, lifecycle timestamps, `lateDays`, `lateFeePaise`, CHECK `endDate > startDate` |
| `PurchaseOrder` | Pre-owned sale | `idempotencyKey` unique, price snapshot, `status` |
| `Payment` | Simulated provider charge | `idempotencyKey` unique, `status` CREATED/PENDING/SUCCESS/FAILED/REFUND_PENDING/REFUNDED, CHECK amount > 0; linked to booking **or** order |
| `Refund` | Refund records | `type` DEPOSIT_RETURN/CANCELLATION/DISPUTE, `status` PENDING/PROCESSED |
| `Handover` | Pickup or return step | unique `(bookingId, type)` and `(purchaseOrderId, type)`, per-party confirmation timestamps |
| `HandoverEvidence` | Append-only notes and photos | `correctsId` self-relation for audited corrections. There is no update path in code |
| `Review` | Rating and comment | `bookingId` unique / `purchaseOrderId` unique (one review per transaction), CHECK rating 1–5, CHECK exactly one target |
| `Dispute` + `DisputeEvidence` | Dispute case | `category`, `status` OPEN/UNDER_REVIEW/RESOLVED/REJECTED, `refundDecision`, resolver |
| `Notification` | In-app notifications | index `(userId, readAt, createdAt)` |
| `AuditLog` | Append-only audit trail | indexes on `(entityType, entityId)`, `createdAt`, `actorId` |
| `PlatformSetting` | Singleton (id = 1) business config | `commissionBps` (5–10%), `customerFeeBps`, `holdMinutes` |

## Relations and cascade behaviour

- Deleting a user cascades to their profile, sessions, tokens, favourites, holds and notifications. Users **with** bookings, orders or payments are `Restrict`ed, so financial history is never orphaned.
- Listings with bookings or orders are `Restrict`ed. Images and favourites cascade.
- Refunds `Restrict` deletion of their payment. Audit logs `SetNull` the actor.

## Indexes

Beyond the PK and unique indexes:

- `Listing(status, categoryId)`, `Listing(sellerId)`, `Listing(area)`, `Listing(createdAt)`
- GIN full-text index `Listing_search_idx` on title, brand, model and description (migration `…_search_index`)
- `RentalBooking(listingId, status, startDate, endDate)` for availability queries
- `BookingHold(listingId, status, expiresAt)`
- Per-user listing indexes on bookings, orders, payments and notifications

## Business rules enforced in the data layer

| Rule | Mechanism |
| --- | --- |
| No double booking | `SELECT … FOR UPDATE` on the listing row serialises every reservation for that listing. Available stock = `stockQuantity − peak concurrent reserved units` in the window. |
| Overlap test | `existing.startDate < requested.endDate AND existing.endDate > requested.startDate` |
| What blocks stock | Bookings in PENDING_PAYMENT (≤ 15 min old), REQUESTED, CONFIRMED, ACTIVE, RETURN_PENDING, plus ACTIVE unexpired holds. Cancelled, rejected, failed and completed bookings and released or expired holds do not. |
| Single-unit sale | Stock decremented inside the locked transaction. CHECK `stockQuantity >= 0` as a last line of defence. |
| Idempotency | Unique `idempotencyKey` on bookings, orders and payments, and a racing request returns the existing row. |
| One review per transaction | Unique `bookingId` / `purchaseOrderId` on `Review` |
| Price integrity | Totals computed server-side and snapshotted on the booking/order (rates included), so later commission changes don't rewrite history. |

## Backups (production guidance)

- Supabase Pro takes daily backups. Enable **Point-in-Time Recovery** for a real launch.
- Before risky migrations: `pg_dump "$DIRECT_URL" -Fc -f borrowly-$(date +%F).dump`, and restore with `pg_restore -d "$DIRECT_URL" --clean borrowly-….dump`.
- Never run `npm run db:seed` or the admin demo reset against a production database. The seed wipes all tables.
