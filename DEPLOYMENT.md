# Deployment (Vercel + Supabase)

> **Status:** everything is prepared but **not deployed yet**. Deploying needs your own Vercel and Supabase accounts, and no credentials were available while building. Follow the steps below; they take about 15 minutes.

## 1. Supabase (database and storage)

1. Create a project at https://supabase.com (region: **Mumbai, ap-south-1**, closest to Coimbatore).
2. Under **Project Settings → Database → Connection string**, copy:
   - **Transaction pooler** (port 6543) → `DATABASE_URL`, and append `?pgbouncer=true&connection_limit=1`
   - **Session pooler / direct** (port 5432) → `DIRECT_URL` (used by migrations)
3. Under **Storage**, create two buckets:
   - `listing-images` with **Public** on
   - `evidence` with **Public** off (handover and dispute photos stay private)
4. Under **Project Settings → API**, copy the **Project URL** → `SUPABASE_URL` and the **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`. The service-role key is a secret: keep it server-side only and never commit it.

## 2. Migrate and seed (from your machine, once)

```bash
# PowerShell: $env:DATABASE_URL="..."; $env:DIRECT_URL="..."
export DATABASE_URL="<pooler url>"
export DIRECT_URL="<direct url>"
npx prisma migrate deploy
npm run db:seed        # demo data: only for the demonstration deployment
```

## 3. Vercel (application)

1. At https://vercel.com, choose **Add New → Project** and import `subii13/Borrowly-`.
2. Framework: Next.js (auto-detected). **Build command:** `npm run vercel-build`. This runs `prisma generate`, then `prisma migrate deploy`, then `next build`.
3. Environment variables (Production and Preview):

| Name | Value |
| --- | --- |
| `DATABASE_URL` | Supabase pooler URL |
| `DIRECT_URL` | Supabase direct URL |
| `APP_URL` | `https://<your-app>.vercel.app` |
| `DEMO_MODE` | `true` for the evaluation demo, otherwise unset |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role key (**secret**) |
| `SUPABASE_PUBLIC_BUCKET` | `listing-images` |
| `SUPABASE_PRIVATE_BUCKET` | `evidence` |
| `PAYMENT_PROVIDER` | `demo` |

4. Deploy. With the Supabase variables set, uploads go to Supabase Storage automatically (`src/lib/storage.ts`). Without them, the app would try to write to local disk, which is read-only on Vercel.

## 4. Verify the live site

- `GET https://<app>/api/health` should return `{"status":"ok","database":"up","storage":"supabase"}`.
- Open `/demo` and sign in as each role.
- As the customer: rent an item and complete the demo payment.
- As the seller: create a listing with a photo. The image URL should point to `…supabase.co/storage/v1/object/public/listing-images/…`.
- As the admin: open **Settings** and check that storage shows "Supabase Storage".

Optional: run the end-to-end suite against the deployment (it **re-seeds the database**, so only do this on the demo deployment):

```bash
E2E_BASE_URL=https://<app> npx playwright test
```

## Demo data on the live site

- The demo is designed to be explored on a seeded database. As admin, **Settings → Reset demo data** restores it (only when `DEMO_MODE=true`).
- For a real launch: leave `DEMO_MODE` unset, do not run the seed, and create the first admin by promoting a user in SQL: `UPDATE "User" SET role='ADMIN' WHERE email='you@…';`

## Production checklist

- [ ] `DEMO_MODE` decided (demo deployment vs real launch)
- [ ] Supabase PITR or daily backups enabled (see DATABASE_DESIGN.md → Backups)
- [ ] Rate-limit store moved to Redis/Upstash for multi-instance deployments
- [ ] Email/SMS provider wired in place of the dev outbox (`sendDevMessage`)
- [ ] Real payment gateway implementing `PaymentProvider`, with signed webhooks
- [ ] Content-Security-Policy header added
- [ ] Custom domain and HTTPS (automatic on Vercel)

## Local production build

```bash
npm run build
npm start          # http://localhost:3000
```

Verified locally: `next build` completes with no errors, and all routes compile (see TESTING.md).
