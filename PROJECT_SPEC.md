# Borrowly: product specification

**Product:** Borrowly · **Tagline:** Own less. Access more. · **Positioning:** "The Amazon for things you don't need to own."
**Category:** Peer-to-peer rental and pre-owned marketplace · **Launch market:** Coimbatore, Tamil Nadu · **Platform:** responsive web app.

## Problem

People buy expensive items they use rarely, while similar items sit idle nearby. Informal rentals (WhatsApp, classifieds) have no availability management, transaction record, seller trust signals, booking workflow or dispute handling.

## Users

| Persona | Needs |
| --- | --- |
| Customer | Find an item nearby, see real availability and the full price, book or buy safely, have a record if something goes wrong |
| Seller (individual or small business) | List quickly, control price, deposit, dates and stock, avoid double bookings, document handover and returns, see earnings |
| Admin (operations) | Verify sellers, moderate listings, oversee transactions, resolve disputes, record refunds, audit actions, tune commission |

One account can be both customer and seller.

## Differentiators

1. Rent **or** buy from the same listing
2. Verified seller profiles (honestly defined: email, phone and admin review, with no ID documents)
3. Real-time rental availability
4. Structured booking and order management
5. Handover and return evidence
6. Seller inventory and earnings dashboard
7. Local discovery by Coimbatore area

## Functional requirements (status)

All of the following are **implemented** unless noted.

### Marketplace

- 9 categories with images, descriptions and live counts. 38 seeded listings with real photos.
- Search (full-text and substring) with suggestions. Filters: category, area, condition, rent / buy / both, price range. Sort: relevance, newest, price ascending and descending. Pagination (12 per page).
- Product page: gallery, details, condition, seller with rating and verification, location (area and pincode), rental rate, deposit, sale price, availability calendar, related items, reviews.
- Favourites. Area selector (cookie).

### Listings

- Fields: title, description, category, brand, model, condition, images (1–8), city, area, pincode, seller, rental/purchase toggles, daily rate, deposit, sale price, stock, min/max rental days, status.
- States: DRAFT, ACTIVE, INACTIVE, SOLD_OUT, SUSPENDED.
- 7-step creation wizard (React Hook Form + Zod) with server re-validation. Edit, publish, deactivate. Admin suspend and reinstate.

### Rentals

The full 19-step workflow from the brief: browse, rent, dates, availability check, price and deposit, review the total, checkout, simulated payment, confirmation, tracking, seller confirms, both confirm handover, active, return recorded, both confirm return, complete, review.

- Half-open date intervals. Overlap rule `existing.start < req.end && existing.end > req.start`.
- Holds with expiry, row locks, idempotency, cancellation with refund, late-return tracking and fees.
- Sellers cannot book their own listings.

### Purchases

Select, buy, review, checkout, reserve stock, simulated payment, order, seller notified, seller accepts, handover, buyer confirms receipt, complete, review. Duplicate open orders and sold-out purchases are rejected. Single-stock items are race-safe.

### Payments

Demo provider (approve or decline). States: CREATED, PENDING, SUCCESS, FAILED, REFUND_PENDING, REFUNDED. Integer paise. Configurable commission (5–10%) and customer service fee. Transaction history. A provider interface is ready for a real gateway. No escrow.

### Trust

- Seller verification states NOT_SUBMITTED / PENDING / VERIFIED / REJECTED / SUSPENDED, with email verification, a phone OTP boundary and admin review.
- Reviews: one per completed transaction, with seller and listing rating aggregates.
- Disputes in 7 categories, with evidence, status tracking, admin investigation, resolution note, refund decision and audit trail.
- Notifications. Audit log.

### Dashboards

Customer, seller and admin dashboards as listed in README. All figures come from database records.

## Non-functional requirements

- **Security:** server-side authentication, authorization and validation. See SECURITY.md.
- **Responsive:** checked at 375 px across key pages (automated overflow test) and on desktop.
- **Accessibility:** semantic landmarks, labelled form controls, keyboard-reachable menus, `aria` state on toggles, visible focus outlines.
- **Performance:** server rendering, `next/image` responsive images, indexed queries.

## Business model

5–10% commission on completed transactions (default 8%, configurable) plus a 2% customer service fee (configurable). Paid listing plans and seller subscriptions are **future options, not implemented**.

## Out of scope for this MVP (future enhancements)

- Real payment gateway and payouts (a regulated partner such as Razorpay Route)
- Supabase Auth or social login (the auth boundary exists)
- Real email and SMS delivery (outbox boundary exists)
- In-app chat between parties
- Map-based search, delivery logistics, insurance products
- Native mobile apps
