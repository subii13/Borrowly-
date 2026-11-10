# Borrowly: rent anything just by saying it

**Great Indian AI Internship Challenge · Gnani AI** · Live: https://borrowly-sigma.vercel.app · Code: https://github.com/subii13/Borrowly-

## The problem
People in Indian cities buy cameras, drills, projectors and party gear for a single weekend, and then those things sit unused. Renting from neighbours is cheaper and more sustainable, but today it happens in WhatsApp groups with no trust, no records and no availability. Typing long forms in English also shuts out many people who think and speak in Tamil or Tanglish.

## The solution
**Borrowly** is a voice-first, peer-to-peer rental and pre-owned marketplace for Coimbatore. You *say* what you need, in Tamil, Tanglish or English, and Borrowly finds it, picks your dates and answers back out loud. Sellers list an item by describing it in one sentence.

Every booking has a full paper trail: verified sellers, row-locked availability so an item can never be double booked, prices calculated on the server, a simulated payment, documented handover and return with photos and notes, deposits, reviews and disputes.

## How Gnani AI powers it
| Feature | Gnani model | What happens |
| --- | --- | --- |
| **Voice search** | Prisma STT (`prisma-v3.0`, `ta-IN,en-IN`, code-mix) | *"நாளைக்கு RS Puram-ல ஒரு DSLR camera வேணும்"* → item, area, dates and rent/buy are extracted and the results open with those dates selected. |
| **Spoken replies** | Timbre TTS (`timbre-v3.0`) | Borrowly reads the results and booking updates aloud in Tamil or English, and the user can stop the reply at any time. |
| **Speak-to-list** | Prisma STT | *"Bosch cordless drill, good condition, 180 rupees per day, deposit 1500"* → brand, category, condition, price and deposit fill themselves into the listing form. |
| **Voice handover notes** | Prisma STT | At pickup and return, the condition notes are dictated instead of typed. |

Local area and brand names are sent to Prisma as **keyterms**, so "RS Puram" isn't misheard as "Arasapuram". A Tamil-aware parser (which handles letter variants, Tamil number words and relative dates like நாளைக்கு and "this weekend") turns each transcript into a structured intent. Recording stops automatically when the speaker goes quiet, and a 3D voice orb reacts while the app listens, thinks and speaks.

## Why it matters
- **Inclusive:** people can use the marketplace in the language they actually speak, without typing.
- **Fast:** a voice search or a new listing takes one sentence instead of a multi-step form.
- **Trustworthy:** the full booking trail makes renting from strangers feel safe.
- **Sustainable:** fewer things are bought for one-time use, and idle items earn money for their owners.

## Built with
Next.js 16 (App Router, Server Actions), React 19, TypeScript, Tailwind CSS 4, Prisma ORM, PostgreSQL (Supabase), three.js / React Three Fiber, deployed on Vercel. 70+ unit tests cover the voice parser, including real Prisma transcripts.

**Try it:** open https://borrowly-sigma.vercel.app/demo for one-click sign-in, then tap the orb and speak.
