# Testing

## How to run

```bash
npm run db:local                # terminal 1: PostgreSQL on :5433 (needed by integration + e2e)
npm test                        # Vitest: unit + integration (uses database borrowly_test, created automatically)
npm run test:e2e                # Playwright against http://localhost:3000 (starts `npm run dev` if not running)
E2E_BASE_URL=http://localhost:3100 npx playwright test          # against a production build (`next build && next start -p 3100`)
SCREENSHOTS=1 npx playwright test tests/e2e/screenshots.spec.ts  # regenerate README screenshots + mobile overflow check
npm run typecheck
```

- Integration tests run against a **separate database** (`borrowly_test`, or `TEST_DATABASE_URL`) and wipe it between tests. They never touch the dev database.
- **The Playwright global setup reseeds the configured database.** Run it only against local or demo environments.
- First-time Playwright setup: `npx playwright install chromium`.

## Results (latest run, 5 Nov 2026, Windows 11, Node 24, PostgreSQL 17)

| Suite | Result |
| --- | --- |
| `tsc --noEmit` | ✅ no errors |
| `next build` | ✅ compiled successfully, all routes built |
| Vitest unit (3 files) | ✅ **24 / 24** passed |
| Vitest integration (3 files, real PostgreSQL) | ✅ **25 / 25** passed |
| Playwright e2e (production build, Chromium) | ✅ **8 / 8** passed |

```
 Test Files  6 passed (6)
      Tests  49 passed (49)

  ok 1 admin: dashboard → verify seller → moderate listing → review dispute → resolve
  ok 2 non-admins are kept out of the admin console
  ok 3 customer rental: login → explore → search → product → dates → checkout → demo payment → tracking
  ok 4 customer purchase: login → product → buy → checkout → demo payment → confirmation
  ok 5 declined demo payment does not create a confirmed booking
  ok 6 desktop screenshots
  ok 7 mobile layouts do not overflow horizontally
  ok 8 seller: dashboard → create listing with photo → publish → manage booking → handover → earnings
  8 passed
```

## Coverage of the required test areas

| # | Area | Where |
| --- | --- | --- |
| 1 | Registration and login | `integration/accounts-listings` (register, duplicate email, verify email, wrong password, unknown email, reset password) |
| 2 | Demo login | e2e: all role flows sign in through `/demo` |
| 3 | Role authorization | `unit/security` (assertAdmin, party checks), `integration/*` (non-admin resolve, suspend, moderate, settings), e2e "non-admins are kept out" |
| 4 | Seller profile creation | `integration/accounts-listings` (becomeSeller and verification prerequisites) |
| 5 | Listing creation | `integration/accounts-listings`, e2e seller wizard |
| 6 | Image upload | `unit/security` (magic bytes, re-encode, size), e2e seller (real upload through `/api/uploads`), integration (foreign storage key rejected, URL derived on the server) |
| 7–8 | Search and filtering | `integration/accounts-listings` (query, category, area, mode, price, SQL injection) |
| 9 | Rental price calculation | `unit/pricing-availability`, `integration/rentals` |
| 10 | Rental availability | `unit/pricing-availability` (overlap, peak), `integration/rentals` (multi-unit) |
| 11 | Overlap rejection | `integration/rentals`, `unit/money-dates` (half-open: back-to-back allowed) |
| 12 | Concurrent booking protection | `integration/rentals`: 6 simultaneous holds on 1 unit gives exactly 1 success |
| 13 | Hold expiration | `integration/rentals` |
| 14 | Cancellation | `integration/rentals` (refund recorded, stock released) |
| 15 | Purchase workflow | `integration/purchases-disputes`, e2e customer purchase |
| 16 | Sold-out rejection | `integration/purchases-disputes`: 5 simultaneous buyers on 1 unit gives exactly 1 sale, then SOLD_OUT |
| 17–18 | Payment success / failure | integration (both engines), e2e declined payment |
| 19 | Server-side price calculation | integration asserts totals computed from DB prices and settings |
| 20 | Order tracking | e2e booking page progress and status |
| 21 | Handover | `integration/rentals` (two-party confirmation, duplicate confirm blocked, foreign evidence rejected), e2e seller |
| 22 | Reviews | `integration/rentals` (blocked before completion, one per transaction, rating aggregates) |
| 23 | Disputes | `integration/purchases-disputes` (non-party blocked, duplicate blocked, admin partial refund, processing, audit) |
| 24 | Admin actions | integration (suspend, settings bounds, moderation, verification), e2e admin |

Also covered: idempotency races for rental and purchase checkout, money maths without floats, safe error messages, rate limiting, mobile layout (18 pages at 375 px).

## Defects found by the tests and fixed

1. **Idempotency race:** a second concurrent checkout with the same key returned "reservation expired". It now returns the existing booking or order.
2. **Database encoding:** the local cluster was WIN1252, so `→` in notifications failed to save. Clusters are now initialised as UTF-8.
3. **Mobile overflow:** dashboard grids widened to fit long truncated text (+150 px). Fixed with `minmax(0,1fr)` tracks.

## Manual checks

Click-through in the browser of the rental checkout, seller confirm and handover, and admin seller approval. HTTP 200 smoke checks on every customer, seller and admin route.

Not automated: cross-browser testing beyond Chromium, and screen-reader audits.
