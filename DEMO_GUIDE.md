# Demo guide

All data is demonstration data and every payment is simulated. Dates in the seed are relative to the day you seeded, so "active" and "upcoming" always look current.

**Credentials:** development and demo only. The password for all accounts is `Borrowly@Demo2026`.

| Role | Email |
| --- | --- |
| Customer | `customer@borrowly.demo` (Arjun Krishnan, Peelamedu) |
| Seller | `seller@borrowly.demo` (Karthik Raman, "Raman Gear Hub", RS Puram, verified) |
| Admin | `admin@borrowly.demo` (Meera Iyer, operations) |

Other seeded sellers: Divya's Home Studio (verified), Coimbatore Tool Library (verified), EventKart Coimbatore (verified), Peelamedu Campus Rentals (verified), Rahul's Outdoor Kit (**pending** verification), Ananya's Study Shelf (not submitted) and Vikram Travels Gear (**rejected**). Their emails are listed in `src/modules/demo/catalogue.ts`.

With `DEMO_MODE=true`, use **/demo** for one-click sign-in. To restore everything, run `npm run db:seed`, or as admin use **Settings → Reset demo data**.

---

## 1. Visitor (no login)

1. **Homepage:** hero search with suggestions (type "can"), popular searches, 9 category tiles with live counts, top-rated listings, the Coimbatore area grid, and the seller call to action.
2. **Explore:** search "projector", then filter **Rent & buy**, area **RS Puram**, sort **Price: low to high**. On a phone, filters open as a bottom sheet.
3. **Location selector** (top bar): pick "Saibaba Colony", and Explore pre-filters to that area.
4. **Product page:** gallery (arrows, thumbnails, full-screen view), Rent/Buy tabs, and the live availability calendar (booked days are struck through). Seller card, reviews, related items.
5. **Seller profile:** click the seller name. It shows only public data; the address is never shown here.

## 2. Customer: Arjun

| Try | Where |
| --- | --- |
| Rent: pick dates on any rentable item, then **Reserve these dates**, then checkout. Choose **Approve** and pay. | Product → checkout → `/account/bookings/:id` |
| Payment failure: repeat the above but choose **Decline payment**. The booking is marked *Payment failed* and the dates are released. | checkout |
| Buy: open "Student Compound Microscope", then the **Buy** tab, **Buy now**, pay. | `/account/purchases/:id` |
| Active rental: the Sony α7 III is with Arjun now. Open it to see the handover evidence from both sides. | `/account/bookings` → Active |
| Confirm receipt: the Raspberry Pi kit was handed over, so press **Confirm I received the item**. The order completes and a review form appears. | `/account/purchases` |
| Review: the Manfrotto tripod rental is completed but not reviewed. Leave a star rating. Reviewing a second time is blocked. | `/account/bookings` → Completed |
| Disputes: the camping-tent dispute is *Resolved* with a partial refund pending. Open any paid booking and choose **Report a problem** to raise a new one with photos. | `/account/disputes` |
| Favourites, notifications, transaction history, profile, change password. | account menu |

## 3. Seller: Raman Gear Hub

| Try | Where |
| --- | --- |
| Dashboard: KPIs, gross / commission / net, a 6-month earnings chart (from completed transactions), requests to confirm, upcoming returns. | `/seller` |
| **Confirm a request:** Kavya's α7 III or Nithya's projector → **Confirm booking**, or **Decline** with a reason (an automatic demo refund follows). | `/seller/bookings` → Requests |
| **Handover:** Sneha's Canon 80D starts today. Add notes and photos, then **Confirm item handed over**. It becomes active after Sneha confirms too. | `/seller/bookings` → Confirmed |
| **Return:** Deepak already confirmed returning the softbox kit. Confirm on your side to complete it and release the deposit (late fee applied if overdue). | `/seller/returns` |
| **Purchase order:** Sneha bought the Canon 50 mm lens. **Accept order**, then **Confirm item handed over**. | `/seller/orders` |
| **Create a listing:** 7-step wizard (details, category & condition, photos, pricing, location, preview, publish). Upload your own JPEG/PNG/WebP photos; you can reorder or remove them, and the first is the cover. | `/seller/listings/new` |
| Edit, deactivate or publish listings. The ThinkPad shows **Sold out**. | `/seller/listings` |
| Earnings history and the verification checklist. | `/seller/earnings`, `/seller/verification` |

> Sign in as a fresh account to try the verification flow end to end: register, verify email (the link is in **/dev/outbox**), start selling, send a phone code (also in the outbox), then submit for review.

## 4. Admin: Meera

| Try | Where |
| --- | --- |
| Platform overview: users, verification queue, active listings, disputes, GMV, commission, status breakdowns, recent audit events. | `/admin` |
| **Verify seller:** approve or reject Rahul's Outdoor Kit (a note is required to reject). | `/admin/verification` |
| **Moderate listing:** search "Bean", then **Suspend** with a reason. The seller is notified and the listing disappears from the marketplace. Reinstate it afterwards. | `/admin/listings` |
| **Dispute:** open the *Payment issue* dispute, **Start review**, then record a decision (no refund, partial or full). | `/admin/disputes/:id` |
| **Refunds:** process the pending ₹300 camping-tent refund. The payment status updates. | `/admin/refunds` |
| Users (suspend or reactivate), sellers, bookings and purchases with filters, reports (monthly GMV, category performance), audit logs. | admin nav |
| **Settings:** change commission (5–10%), customer fee and hold length. These apply to new transactions only. **Reset demo data** is also here. | `/admin/settings` |

Admin pages enforce the role on the server. As the customer, visiting `/admin` redirects back to the account page.
