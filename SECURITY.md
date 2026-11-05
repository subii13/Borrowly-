# Security

## Authentication

- **First-party sessions.** On login, a random 256-bit token is set in a cookie (`borrowly_session`: `httpOnly`, `SameSite=Lax`, `Secure` in production, 14-day expiry). Only its SHA-256 hash is stored in `Session`. Logout deletes the row, and suspension or password reset deletes all of a user's sessions.
- Passwords are hashed with **bcrypt (cost 12)**. Policy: 8–72 characters with a letter and a digit. Unknown emails go through a dummy bcrypt comparison, so login timing doesn't reveal whether an account exists.
- Email verification and password-reset tokens are random, stored hashed, single-use and time-limited (24 h / 30 min). The forgot-password response is the same whether or not the account exists.
- Phone OTP is 6 digits, hashed, expires in 10 minutes and is rate-limited.
- **Supabase Auth** was specified "where configured". This build uses the first-party session module above, because it works without external credentials and is fully testable. `src/lib/auth.ts` is the single boundary to replace if Supabase Auth is adopted. That swap is **not implemented**.

## Authorization

- The actor (`id`, `role`, `sellerId`) is **always resolved on the server** from the session row. Roles, prices and ownership are never read from the client.
- Every domain function receives the actor and checks it:
  - `assertAdmin` on all admin services (plus `requireAdminPage` in the admin layout and pages)
  - `assertSeller` plus ownership checks on listing changes
  - `requireParty` on bookings, orders, disputes and evidence. Non-parties get **404, not 403**, so private IDs can't be probed.
  - Sellers cannot book or buy their own listings
- `proxy.ts` only redirects cookie-less visitors away from private areas, as a UX shortcut. It is never relied on for security.

## Input handling

- **Zod** validates every action and API input on the server, with the same schemas reused in forms.
- **Prisma** parameterises all queries. The one hand-written SQL builder (search) uses `Prisma.sql` tagged templates, so values are always bound, and `ILIKE` wildcards are escaped. A test checks that an injection attempt returns nothing and leaves the data intact.
- React escapes output by default. No `dangerouslySetInnerHTML` is used anywhere.
- Error messages shown to users come from `AppError` only. Unexpected errors are logged on the server and replaced with a generic message.

## Uploads

- Authenticated only. The `Origin` header must match the host. Rate-limited to 30 per minute per user.
- 5 MB limit. The **real type is detected from magic bytes** (JPEG/PNG/WebP), not from the browser's MIME type.
- Each image is decoded by `sharp` with a pixel limit, auto-rotated, resized to at most 1600 px, and **re-encoded to WebP**, which strips EXIF metadata including GPS.
- Storage keys are server-generated (`scope/userId/random.webp`). When saving a listing or evidence, the server checks that the key belongs to the current user, and listing image URLs are derived from the key, never taken from the client.
- Listing photos are public. **Handover and dispute evidence is private**: it is stored in a private bucket or directory and served only through `/api/evidence/:id` after a party/admin check, with `Cache-Control: private, no-store`.

## Payments and money

- All amounts are integer paise, computed on the server from database prices and settings. Client totals are display-only.
- Booking/order and payment rows are created **before** the provider is charged, so nothing is ever charged without a record. Checkout is idempotent, and the server issues the key.
- Payment success comes only from the provider result on the server, never from the browser.
- The provider is simulated and labelled **"DEMO PAYMENT — No real money will be charged."** Borrowly does not hold funds (no escrow). A real launch would use a regulated payment partner with signed webhooks.

## CSRF, headers, rate limits

- Server Actions get Next.js's built-in Origin/Host check. Mutating API routes check `Origin` themselves. `SameSite=Lax` cookies add a further layer.
- Headers set on every response: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Strict-Transport-Security`. The `X-Powered-By` header is removed.
- Rate limits: login 10/min, register 5/min, forgot/reset password, demo login, holds 20/min, checkout 15/min, uploads 30/min, OTP 3/min. **Limitation:** the store is in process memory, so on multi-instance serverless deployments the limits apply per instance. Use Redis (e.g. Upstash) for production.

## Privacy

- Sellers' pickup address and phone are revealed only to the counterparty after a booking is confirmed or an order accepted. Customer contact details are revealed to the seller under the same rule.
- No Aadhaar or other government ID is collected. "Verified" means email and phone were confirmed and an admin reviewed the profile, and the UI says so.

## Audit and evidence integrity

- `AuditLog` is append-only. Entries cover logins, bookings, payments, handovers, returns, cancellations, moderation, verification, disputes, refunds, settings changes and demo resets.
- Handover evidence has no update or delete path. A correction is a new linked row (`correctsId`), and it is audited.

## Secrets and configuration

- `.env` is git-ignored. `.env.example` contains placeholders only. No secrets are committed.
- `SUPABASE_SERVICE_ROLE_KEY` is read only in server code (`src/lib/env.ts` imports `server-only`) and never uses the `NEXT_PUBLIC_` prefix.

## Demo mode

`DEMO_MODE=true` enables:

- one-click sign-in to the seeded demo accounts, whose passwords are documented publicly anyway
- the development outbox page (in production builds it shows only the signed-in user's own messages)
- an admin-only demo reset that wipes and reseeds the database

**Turn `DEMO_MODE` off and do not seed demo accounts for a real launch.**

## Known limitations

- In-memory rate limiting (see above).
- No email or SMS provider is integrated. Messages go to the dev outbox.
- No antivirus scanning of uploads. Re-encoding removes active content from image files, but a production system should still add scanning.
- Content-Security-Policy is not configured yet. Add a nonce-based CSP before launch.
