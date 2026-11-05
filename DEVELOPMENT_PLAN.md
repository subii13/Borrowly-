# Development plan and status

| Phase | Scope | Status |
| --- | --- | --- |
| 0. Inspection | Remote repository was empty and the local folder was empty, so the project was initialised directly on `main` with `origin` = `subii13/Borrowly-` | ✅ |
| 1. Foundation | Next.js 16 + TypeScript + Tailwind 4, design tokens, Prisma schema and migrations, embedded PostgreSQL for local dev, session auth, roles and permissions, seed infrastructure, navigation | ✅ |
| 2. Visual marketplace | 47 licensed photos (Wikimedia Commons) normalised to 4:3 WebP with credits, homepage, explore, search, filters, product details, seller profiles | ✅ |
| 3. Marketplace engine | Listing wizard and uploads, rental engine (holds, locks, idempotency), purchase engine, checkout, simulated payments, order management | ✅ |
| 4. Dashboards | Customer, seller and admin dashboards, demo accounts, demo seed | ✅ |
| 5. Trust workflows | Handover and return evidence, reviews, disputes, notifications, refunds, audit logs, seller verification | ✅ |
| 6. Testing and polish | 49 Vitest tests (unit + PostgreSQL integration), Playwright workflows, mobile overflow checks, production build | ✅ |
| 7. GitHub and deployment | Commits pushed to `main`, documentation, Vercel + Supabase configuration | ✅ prepared · ⏳ **live deployment requires your Vercel and Supabase accounts** (DEPLOYMENT.md) |

## Notable decisions

- **Prisma 6.19** (stable) rather than the 8.0 release candidate published as `latest` on npm.
- **First-party sessions** instead of Supabase Auth. This keeps the app runnable and testable without external credentials, and `src/lib/auth.ts` is the boundary for a later swap.
- **Server Actions** for mutations, with origin checks built into Next.js. Route handlers are used where JSON or multipart is needed.
- **Row-level `FOR UPDATE` lock on the listing** to serialise reservations. This handles multi-unit stock correctly, which a pure exclusion constraint could not.
- **Two-phase checkout:** the record is created before the charge, so nobody is charged without a record.
- **Integer paise everywhere**, and price snapshots on transactions.

## Issues found and fixed during testing

- The local Postgres cluster initialised with WIN1252 encoding on Windows. It is now forced to UTF-8.
- An idempotency race: two concurrent checkouts with the same key, where the second wrongly reported "reservation expired". The fix returns the first booking or order. Regression tests were added.
- Mobile overflow from grid tracks sized by long truncated text. Grids now use `minmax(0,1fr)` tracks, and an automated overflow check was added.

## Future work

See PROJECT_SPEC.md → Out of scope, and the production checklist in DEPLOYMENT.md.
