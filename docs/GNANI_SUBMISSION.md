# Great Indian AI Internship Challenge: submission kit

**Deadline:** 10 Nov 2026, 11:59 PM IST. The LinkedIn or X post must be live **before** you submit the form.

## Form answers (copy and adapt)

**Project title:** Borrowly Voice: rent and lend in Tamil, Tanglish and English

**The problem:** In Coimbatore, people buy expensive things they use a few times a year, while the same items sit idle a few streets away. Rental marketplaces assume you'll type English into a search box and fill long forms. Many small sellers and older users think and speak in Tamil or Tanglish, so they never list or rent online.

**Who will use it:**
- Customers renting cameras, tools and event gear for a few days.
- Individuals and small shops in Tier-2 Coimbatore earning from idle items, who are more comfortable speaking than typing English.

**Gnani AI models / APIs used:**
- **Prisma v3.0 (speech to text):** `POST /stt/v3` with `language_code=ta-IN,en-IN`, `format=codemix` and marketplace `keyterms`. It powers voice search, speak-to-list and voice handover notes.
- **Timbre v3.0 (text to speech):** `POST /api/v1/tts/inference`, voice *Lakshmi*, `ta-IN`. It powers spoken Tamil replies for search results and booking summaries, with numbers rendered as Tamil words.

**What it does:**
1. **Voice search.** *"Naalaiku oru DSLR camera venum, RS Puram la, rendu naalukku"* becomes item, area and dates. Results are filtered and the dates arrive pre-selected on the booking calendar.
2. **Speak to list.** *"Bosch drill, nalla condition, naalukku 180 rupees, deposit 1500"* fills the listing form (brand, category, condition, prices).
3. **Spoken Tamil replies** via Timbre, with prices said in words.
4. **Voice handover notes:** condition notes are spoken at pickup and return and stored as tamper-proof evidence.

All built on a full working marketplace: real PostgreSQL, bookings with double-booking protection, a demo payment flow, seller and admin dashboards, and 64 automated tests.

**Contribution:** Solo. Product, design, full-stack development, the Gnani integration and testing.

**Links:**
- Live: https://borrowly-sigma.vercel.app/voice
- Code: https://github.com/subii13/Borrowly-

## Awards this entry fits

- Main Character (Tamil)
- Mixed Vibes (Tanglish code-mix)
- Small Town, Big Build (Coimbatore, Tier 2)
- Real Deal (small sellers)
- Solo Ninja
- Demo Day Drop (keep the video to 60 s)

## 60-second demo video script

Record in a quiet room; phone screen recording or desktop is fine. Use the live site with the demo accounts. Speak the Tamil lines yourself.

| Time | Screen | You say / do |
| --- | --- | --- |
| 0–6 s | Borrowly homepage | "Coimbatore speaks Tamil and Tanglish, not English search boxes. This is Borrowly Voice, built on Gnani AI." |
| 6–20 s | Tap the mic in the hero search | Say: **"Naalaiku oru DSLR camera venum, RS Puram la, rendu naalukku."** The panel shows *You said…* plus chips (camera, RS Puram, dates) and the Tamil voice reply plays. |
| 20–28 s | Click the first result | "Gnani Prisma understood the item, the area and the dates. They're already selected on the calendar, and the price comes from the server." |
| 28–45 s | Seller → Create listing → **Speak to list** | Say: **"Bosch drill, nalla condition, naalukku 180 rupees, deposit 1500."** The form fills in. "A shop owner can list without typing English." |
| 45–55 s | A booking → **Hear this booking in Tamil** | Timbre reads the booking summary in Tamil. |
| 55–60 s | Logo / `/voice` page | "Borrowly: own less, access more. Built with Gnani Prisma and Timbre. #GnaniAI" |

Tips:
- Show the transcript on screen. It proves the speech recognition is real.
- Add captions, because many people watch muted.
- Upload natively to LinkedIn or X, not as a YouTube link.

## Post text (LinkedIn / X)

> I built **Borrowly Voice**: rent and lend things in Coimbatore by speaking Tamil, Tanglish or English. 🎙️
>
> Say "Naalaiku oru DSLR camera venum, RS Puram la" and it finds the camera, filters by area and pre-selects your dates. Sellers list items just by describing them, and replies come back in natural Tamil.
>
> Built on @Gnani AI's **Prisma** (speech-to-text, code-mixed Tamil-English) and **Timbre** (Tamil text-to-speech), on a full marketplace with bookings, demo payments and seller dashboards.
>
> Live demo: https://borrowly-sigma.vercel.app/voice
> Code: https://github.com/subii13/Borrowly-
>
> #GnaniAI #GreatIndianAIInternshipChallenge #Tamil #Coimbatore #BuildInPublic

Selection relies on **genuine** engagement. Share the post with classmates and communities, but never buy likes or swap engagement; that's disqualifying.

## Rules checklist

- [ ] Uses a Gnani model: **Prisma + Timbre** ✅
- [ ] Synthetic data only: demo accounts and phone numbers are fictional ✅
- [ ] `GNANI_API_KEY` set in Vercel and redeployed, then the live site checked
- [ ] Video recorded, posted publicly with both hashtags, Gnani AI tagged
- [ ] Form submitted with the post link before 10 Nov, 11:59 PM IST
