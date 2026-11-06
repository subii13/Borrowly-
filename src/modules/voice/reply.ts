// Text for Timbre to speak back. Numbers are written as words, as Gnani's TTS guide recommends.

const ONES = ["", "ஒன்று", "இரண்டு", "மூன்று", "நான்கு", "ஐந்து", "ஆறு", "ஏழு", "எட்டு", "ஒன்பது"];
const TEENS = ["பத்து", "பதினொன்று", "பன்னிரண்டு", "பதிமூன்று", "பதினான்கு", "பதினைந்து", "பதினாறு", "பதினேழு", "பதினெட்டு", "பத்தொன்பது"];
const TENS = ["", "", "இருபது", "முப்பது", "நாற்பது", "ஐம்பது", "அறுபது", "எழுபது", "எண்பது", "தொண்ணூறு"];
const TENS_JOIN = ["", "", "இருபத்தி", "முப்பத்தி", "நாற்பத்தி", "ஐம்பத்தி", "அறுபத்தி", "எழுபத்தி", "எண்பத்தி", "தொண்ணூற்றி"];
const HUNDREDS = ["", "நூறு", "இருநூறு", "முன்னூறு", "நானூறு", "ஐநூறு", "அறுநூறு", "எழுநூறு", "எண்ணூறு", "தொள்ளாயிரம்"];
const HUNDREDS_JOIN = ["", "நூற்றி", "இருநூற்றி", "முன்னூற்றி", "நானூற்றி", "ஐநூற்றி", "அறுநூற்றி", "எழுநூற்றி", "எண்ணூற்றி", "தொள்ளாயிரத்து"];

function below100(n: number): string {
  if (n < 10) return ONES[n];
  if (n < 20) return TEENS[n - 10];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o ? `${TENS_JOIN[t]} ${ONES[o]}` : TENS[t];
}

function below1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (!h) return below100(r);
  return r ? `${HUNDREDS_JOIN[h]} ${below100(r)}` : HUNDREDS[h];
}

/** Spoken Tamil for 0–99,99,999 (Indian grouping: ஆயிரம், லட்சம்). */
export function tamilNumber(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "பூஜ்ஜியம்";
  const lakh = Math.floor(n / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (lakh) parts.push(`${lakh === 1 ? "ஒரு" : below100(lakh)} ${thousand || rest ? "லட்சத்து" : "லட்சம்"}`);
  if (thousand) parts.push(thousand === 1 ? (rest ? "ஆயிரத்து" : "ஆயிரம்") : `${below100(thousand)} ${rest ? "ஆயிரத்து" : "ஆயிரம்"}`);
  if (rest) parts.push(below1000(rest));
  return parts.join(" ");
}

const rupees = (paise: number) => Math.round(paise / 100);

export type SearchReplyInput = {
  tamil: boolean;
  total: number;
  itemLabel?: string;
  query?: string;
  area?: string;
  areaTa?: string;
  dates?: { start: string; end: string; days: number };
  /** Matches across all of Coimbatore when the requested area has none. */
  elsewhere?: number;
  first?: { title: string; dailyRatePaise: number | null; salePricePaise: number | null; rentalEnabled: boolean };
};

export function searchReply(r: SearchReplyInput): string {
  const what = r.itemLabel ?? r.query ?? "";
  if (r.tamil) {
    const place = r.areaTa ? `${r.areaTa} பகுதியில் ` : "கோயம்புத்தூரில் ";
    if (!r.total)
      return r.elsewhere
        ? `${place}${what} இப்போது இல்லை. ஆனால் கோயம்புத்தூரின் மற்ற பகுதிகளில் ${tamilNumber(r.elsewhere)} கிடைக்கின்றன. பகுதியை மாற்றிப் பாருங்கள்.`
        : `மன்னிக்கவும், ${place}${what} இப்போது கிடைக்கவில்லை. வேறு பகுதியில் தேடிப் பாருங்கள்.`;
    let s = `${place}${what ? `${what} ` : ""}${tamilNumber(r.total)} பொருட்கள் கிடைத்தன.`;
    if (r.first) {
      const price = r.first.rentalEnabled && r.first.dailyRatePaise ? `ஒரு நாளுக்கு ${tamilNumber(rupees(r.first.dailyRatePaise))} ரூபாய்` : r.first.salePricePaise ? `விலை ${tamilNumber(rupees(r.first.salePricePaise))} ரூபாய்` : "";
      s += ` முதலாவது, ${r.first.title}. ${price}.`;
    }
    if (r.dates) s += ` உங்கள் ${tamilNumber(r.dates.days)} நாள் தேதிகளை முன்பதிவு பக்கத்தில் தேர்வு செய்துள்ளோம்.`;
    return s;
  }
  const place = r.area ? `in ${r.area}` : "in Coimbatore";
  if (!r.total)
    return r.elsewhere
      ? `Nothing for ${what || "that"} ${place} right now, but there ${r.elsewhere === 1 ? "is 1 match" : `are ${r.elsewhere} matches`} elsewhere in Coimbatore. Try clearing the area filter.`
      : `Sorry, I couldn't find ${what || "that"} ${place} right now. Try another area.`;
  let s = `I found ${r.total} ${r.total === 1 ? "item" : "items"}${what ? ` for ${what}` : ""} ${place}.`;
  if (r.first) {
    const price = r.first.rentalEnabled && r.first.dailyRatePaise ? `${rupees(r.first.dailyRatePaise)} rupees a day` : r.first.salePricePaise ? `${rupees(r.first.salePricePaise)} rupees` : "";
    s += ` The first is ${r.first.title}${price ? `, at ${price}` : ""}.`;
  }
  if (r.dates) s += ` I've pre-selected your ${r.dates.days}-day dates on the booking page.`;
  return s;
}

const STATUS_TA: Record<string, string> = {
  REQUESTED: "முன்பதிவு கோரிக்கை விற்பனையாளருக்கு அனுப்பப்பட்டது. அவர் உறுதி செய்ததும் உங்களுக்குத் தெரிவிப்போம்.",
  CONFIRMED: "முன்பதிவு உறுதி செய்யப்பட்டது. எடுத்துச் செல்லும் முகவரி இப்போது தெரியும்.",
  ACTIVE: "இந்த வாடகை இப்போது நடைமுறையில் உள்ளது.",
  RETURN_PENDING: "திருப்பி அளித்தது பதிவு செய்யப்பட்டது. மற்ற தரப்பு உறுதி செய்ய வேண்டும்.",
  COMPLETED: "வாடகை முடிந்தது. வைப்புத் தொகை விடுவிக்கப்பட்டது.",
  PAYMENT_FAILED: "டெமோ கட்டணம் நிராகரிக்கப்பட்டது. பணம் எதுவும் எடுக்கப்படவில்லை.",
  CANCELLED: "இந்த முன்பதிவு ரத்து செய்யப்பட்டது.",
  REJECTED: "விற்பனையாளர் இந்த முன்பதிவை ஏற்கவில்லை. முழு தொகையும் திருப்பி அளிக்கப்பட்டது.",
};

export function bookingReply(b: { title: string; status: string; days: number; totalPaise: number }): string {
  const status = STATUS_TA[b.status] ?? "";
  return `${b.title}, ${tamilNumber(b.days)} நாட்களுக்கு. மொத்தம் ${tamilNumber(rupees(b.totalPaise))} ரூபாய். ${status}`;
}
