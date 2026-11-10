import { addDays, formatDayISO } from "@/lib/dates";
import { AREA_ALIASES, BRANDS, CUES, ITEMS, type ItemTerm } from "./lexicon";

// Rule-based understanding of short spoken requests in Tamil, Tanglish and English.
// Deterministic and testable; the transcript itself comes from Gnani Prisma.

const TAMIL = /[஀-௿]/;

/**
 * Folds Tamil letters that speech recognition often swaps (ள/ழ→ல, ண/ந→ன, long→short vowel signs)
 * so "பீலமேட்டில்" still matches பீளமேடு and "நாலுக்கூ" matches நாளுக்கு. Applied to both sides of every match.
 */
export const fold = (s: string) =>
  s.replace(/[ளழ]/g, "ல").replace(/[ணந]/g, "ன").replace(/ூ/g, "ு").replace(/ீ/g, "ி").replace(/ே/g, "ெ").replace(/ோ/g, "ொ");

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/(\d),(\d)/g, "$1$2")
    .replace(/r\.\s*s\./g, "rs ")
    .replace(/(\d)(rs|rupees?|₹|ரூ)/g, "$1 $2")
    .replace(/(rs\.?|₹)(\d)/g, "$1 $2")
    .replace(/[,.!?;\n]+/g, " , ")
    .replace(/[:"'()[\]{}|/\\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[஀-௿]+/g, fold);
}

// ─── numbers ─────────────────────────────────────────────────────────────────

const UNITS: Record<string, number> = {
  // Tamil script
  ஒன்று: 1, ஒரு: 1, ஓர்: 1, இரண்டு: 2, ரெண்டு: 2, மூன்று: 3, மூணு: 3, நான்கு: 4, நாலு: 4, ஐந்து: 5, அஞ்சு: 5,
  ஆறு: 6, ஏழு: 7, எட்டு: 8, ஒன்பது: 9, பத்து: 10, இருபது: 20, முப்பது: 30, நாற்பது: 40, ஐம்பது: 50, அறுபது: 60,
  எழுபது: 70, எண்பது: 80, தொண்ணூறு: 90, நூற்றி: 100, இருநூறு: 200, இருநூற்றி: 200, முன்னூறு: 300, நானூறு: 400,
  ஐநூறு: 500, ஐந்நூறு: 500, அஞ்சூறு: 500, அறுநூறு: 600, எழுநூறு: 700, எண்ணூறு: 800, தொள்ளாயிரம்: 900,
  // Romanised Tamil and English
  one: 1, onnu: 1, oru: 1, onru: 1, two: 2, rendu: 2, irandu: 2, three: 3, moonu: 3, moonru: 3, moondru: 3,
  four: 4, naalu: 4, naangu: 4, five: 5, anju: 5, ainthu: 5, six: 6, aaru: 6, seven: 7, ezhu: 7, eight: 8, ettu: 8,
  nine: 9, onbathu: 9, onbadhu: 9, ten: 10, pathu: 10, twenty: 20, irupathu: 20, thirty: 30, muppathu: 30,
  forty: 40, naarpathu: 40, fifty: 50, aimbathu: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  irunooru: 200, munnooru: 300, naanooru: 400, ainooru: 500, anjooru: 500, anjuru: 500, arunooru: 600,
  ezhunooru: 700, ennooru: 800, thollayiram: 900,
};
const MULTIPLIERS: Record<string, number> = {
  நூறு: 100, hundred: 100, nooru: 100, ஆயிரம்: 1000, ஆயிரத்து: 1000, ஆயிரத்தி: 1000, thousand: 1000, aayiram: 1000, ayiram: 1000, aayirathu: 1000, லட்சம்: 100000, lakh: 100000, lakhs: 100000,
};

const UNIT_MAP = new Map(Object.entries(UNITS).map(([k, v]) => [fold(k), v]));
const MULT_MAP = new Map(Object.entries(MULTIPLIERS).map(([k, v]) => [fold(k), v]));

export type Token = { text: string; num?: number };

/** Splits into tokens and folds runs of number words ("rendu aayiram", "1500") into numeric tokens. */
export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  let total = 0;
  let cur = 0;
  let inNumber = false;
  const flush = () => {
    if (inNumber) out.push({ text: String(total + cur), num: total + cur });
    total = cur = 0;
    inNumber = false;
  };
  for (const raw of normalize(text).split(" ")) {
    if (!raw) continue;
    if (/^\d+$/.test(raw)) {
      flush();
      cur = Number(raw);
      inNumber = true;
    } else if (MULT_MAP.has(raw)) {
      const m = MULT_MAP.get(raw)!;
      cur = (cur || 1) * m;
      if (m >= 1000) {
        total += cur;
        cur = 0;
      }
      inNumber = true;
    } else if (UNIT_MAP.has(raw)) {
      cur += UNIT_MAP.get(raw)!;
      inNumber = true;
    } else {
      flush();
      out.push({ text: raw });
    }
  }
  flush();
  return out;
}

// ─── matching helpers ────────────────────────────────────────────────────────

const has = (norm: string, list: string[]) => list.some((w) => (TAMIL.test(w) ? norm.includes(fold(w)) : new RegExp(`(^|\\s)${escape(w)}`).test(norm)));
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Tamil stems and longer Latin cues match as prefixes so inflected forms count ("vikkiren" → "vikk…").
const tokenIs = (t: string, list: string[]) => list.some((w) => (TAMIL.test(w) ? t.startsWith(fold(w)) : w.length >= 4 ? t.startsWith(w) : t === w));
const isDayWord = (t: string) => tokenIs(t, CUES.day) && !t.startsWith(fold("நாளை")) && !/^n+a+l+a+i/.test(t);
const isWeekWord = (t: string) => tokenIs(t, CUES.week) && !t.startsWith("weekend");

function findItem(norm: string): ItemTerm | undefined {
  let best: { item: ItemTerm; at: number; len: number } | undefined;
  for (const item of ITEMS) {
    for (const alias of item.aliases) {
      const at = TAMIL.test(alias) ? norm.indexOf(fold(alias)) : norm.search(new RegExp(`(^|\\s)${escape(alias)}`));
      if (at >= 0 && (!best || at < best.at || (at === best.at && alias.length > best.len))) best = { item, at, len: alias.length };
    }
  }
  return best?.item;
}

function findArea(norm: string) {
  const squashed = norm.replace(/\s/g, "");
  return AREA_ALIASES.find((a) => a.aliases.some((alias) => {
    const f = TAMIL.test(alias) ? fold(alias) : alias;
    return norm.includes(f) || squashed.includes(f.replace(/\s/g, ""));
  }));
}

export const isTamilish = (text: string, detected?: string | null) =>
  TAMIL.test(text) || detected === "ta-IN" || /\b(venum|vendum|irukka|iruka|kidaikuma|kidaikkuma|naalaiku|naalaikku|enakku|ennaku|vaadagai|kulla|panna|pannunga|nalla)\b/.test(text.toLowerCase());

// ─── search intent ───────────────────────────────────────────────────────────

export type SearchIntent = {
  transcript: string;
  q?: string;
  itemLabel?: string;
  category?: string;
  area?: string;
  areaTa?: string;
  mode?: "rent" | "buy";
  start?: string;
  end?: string;
  days?: number;
  max?: number;
  tamil: boolean;
};

const STOP = new Set(
  "i me my need want a an the for in at near from please some any to of on with is are can get show find looking rent rental buy hire days day tomorrow today week this next under below within budget rupees rupee rs venum vendum veenum oru enakku ennaku ku la le irukka iruka kidaikuma kidaikkuma pannanum vaanganum naalaiku naalaikku innaiku inniku and or also want".split(" "),
);

function nextSaturday(today: Date) {
  const dow = today.getUTCDay();
  return addDays(today, ((6 - dow + 7) % 7) || 7);
}

export function parseSearchIntent(transcript: string, today: Date, detectedLanguage?: string | null): SearchIntent {
  const norm = normalize(transcript);
  const tokens = tokenize(transcript);
  const intent: SearchIntent = { transcript, tamil: isTamilish(transcript, detectedLanguage) };

  const item = findItem(norm);
  if (item) {
    intent.q = item.query;
    intent.itemLabel = item.label;
    intent.category = item.category;
  }
  const area = findArea(norm);
  if (area) {
    intent.area = area.area;
    intent.areaTa = area.ta;
  }

  // Dates
  let start: Date | undefined;
  if (has(norm, CUES.dayAfter)) start = addDays(today, 2);
  else if (has(norm, CUES.tomorrow)) start = addDays(today, 1);
  else if (has(norm, CUES.today)) start = today;
  else if (has(norm, CUES.weekend) || has(norm, CUES.saturday)) start = nextSaturday(today);
  else if (has(norm, CUES.sunday)) start = addDays(nextSaturday(today), 1);

  let days: number | undefined;
  tokens.forEach((t, i) => {
    if (t.num === undefined || days !== undefined) return;
    const following = tokens.slice(i + 1, i + 3).map((x) => x.text);
    // "இரண்டு நாளைக்கு" = "for two days" (நாளைக்கு alone means "tomorrow").
    const countedTomorrowWord = following[0] !== undefined && (following[0].startsWith(fold("நாளைக்")) || /^n+a+l+a+i+k/.test(following[0]));
    if (following.some(isDayWord) || (countedTomorrowWord && t.num > 1)) days = t.num;
    else if (following.some(isWeekWord)) days = t.num * 7;
  });
  if (days === undefined && tokens.some((t) => isWeekWord(t.text))) days = 7;
  if (days === undefined && has(norm, CUES.weekend)) days = 2;
  if (days !== undefined && (days < 1 || days > 60)) days = undefined;
  if (days !== undefined && !start) start = addDays(today, 1);
  if (start) {
    intent.start = formatDayISO(start);
    intent.days = days ?? 1;
    intent.end = formatDayISO(addDays(start, intent.days));
  }

  // Budget: a number near an "under / kulla" cue that is not a day count.
  tokens.forEach((t, i) => {
    if (t.num === undefined || intent.max !== undefined || t.num < 20) return;
    const around = tokens.slice(Math.max(0, i - 3), i + 4).map((x) => x.text);
    const after = tokens.slice(i + 1, i + 3).map((x) => x.text);
    if (after.some((w) => isDayWord(w) || isWeekWord(w))) return;
    if (around.some((w) => tokenIs(w, CUES.under) || w.includes("குள்") || w.endsWith("kulla"))) intent.max = t.num;
  });

  // Rent or buy
  if (has(norm, CUES.rent) || intent.start) intent.mode = "rent";
  else if (has(norm, CUES.buy)) intent.mode = "buy";

  // Fallback query: leftover English words (e.g. a brand or item we don't have in the lexicon).
  if (!intent.q) {
    const areaWords = new Set(AREA_ALIASES.flatMap((a) => a.area.toLowerCase().split(" ")));
    const words = tokens.map((t) => t.text).filter((w) => (/^[a-z]{3,}$/.test(w) || /^[a-z]+\d+[a-z0-9]*$/.test(w)) && !STOP.has(w) && !areaWords.has(w) && !tokenIs(w, [...CUES.day, ...CUES.week, ...CUES.money]));
    if (words.length) intent.q = words.slice(0, 3).join(" ");
  }
  return intent;
}

export function exploreUrl(intent: SearchIntent): string {
  const p = new URLSearchParams();
  if (intent.q) p.set("q", intent.q);
  if (intent.area) p.set("area", intent.area);
  if (intent.mode) p.set("mode", intent.mode);
  if (intent.max) p.set("max", String(intent.max));
  if (intent.start && intent.end) {
    p.set("start", intent.start);
    p.set("end", intent.end);
  }
  p.set("voice", "1");
  return `/explore?${p.toString()}`;
}

// ─── listing draft ───────────────────────────────────────────────────────────

export type ListingDraft = {
  transcript: string;
  title: string;
  description: string;
  brand?: string;
  categorySlug?: string;
  condition: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR";
  rentalEnabled: boolean;
  purchaseEnabled: boolean;
  dailyRate?: number;
  deposit?: number;
  salePrice?: number;
  understood: string[];
};

const titleCase = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

/** Turns a seller's spoken description ("Bosch drill, nalla condition, naalukku 180 rupees…") into form values. */
export function parseListingDraft(transcript: string): ListingDraft {
  const norm = normalize(transcript);
  const tokens = tokenize(transcript);
  const item = findItem(norm);
  const brand = BRANDS.find((b) => new RegExp(`(^|\\s)${escape(b.toLowerCase())}(\\s|$)`).test(norm));

  let condition: ListingDraft["condition"] = "GOOD";
  if (has(norm, CUES.condLikeNew)) condition = "LIKE_NEW";
  else if (has(norm, CUES.condFair)) condition = "FAIR";
  else if (has(norm, CUES.condNew) && !has(norm, CUES.condGood)) condition = "NEW";

  let dailyRate: number | undefined;
  let deposit: number | undefined;
  let salePrice: number | undefined;
  type Kind = "deposit" | "day" | "sell";
  // In a seller's description "நாளைக்கு 180" means "180 per day", not "tomorrow".
  const perDay = (w: string) => isDayWord(w) || tokenIs(w, CUES.rent) || w.startsWith(fold("நாளைக்")) || /^n+a+l+a+i+k/.test(w);
  const kindOf = (w: string): Kind | null =>
    tokenIs(w, CUES.deposit) ? "deposit" : perDay(w) ? "day" : tokenIs(w, CUES.sell) || tokenIs(w, CUES.buy) || w === "price" || w.startsWith(fold("விலை")) ? "sell" : null;
  tokens.forEach((t, i) => {
    if (t.num === undefined || t.num < 10) return;
    // Nearest cue wins (commas count as distance, since Prisma often writes "deposit, 1500");
    // on a tie the cue before the number wins. Another number in between stops the search.
    let best: { kind: Kind; dist: number } | null = null;
    for (const dir of [-1, 1]) {
      for (let d = 1; d <= 4; d++) {
        const w = tokens[i + dir * d]?.text;
        if (!w || tokens[i + dir * d].num !== undefined) break;
        if (w === ",") continue;
        const kind = kindOf(w);
        if (kind) {
          if (!best || d < best.dist) best = { kind, dist: d };
          break;
        }
      }
    }
    if (!best) return;
    if (best.kind === "deposit" && deposit === undefined) deposit = t.num;
    else if (best.kind === "day" && dailyRate === undefined) dailyRate = t.num;
    else if (best.kind === "sell" && salePrice === undefined) salePrice = t.num;
  });

  const rentalEnabled = dailyRate !== undefined || has(norm, CUES.rent);
  const purchaseEnabled = salePrice !== undefined || has(norm, CUES.sell);

  // Title: brand + item when recognised, otherwise the first spoken clause (if in Latin script).
  const firstClause = transcript.split(/[,.\n]/)[0].trim();
  let title = [brand, item ? titleCase(item.label) : undefined].filter(Boolean).join(" ");
  if (!title && firstClause && !TAMIL.test(firstClause)) title = titleCase(firstClause.slice(0, 80));
  if (title.length < 6) title = title ? `${title} for rent` : "";

  const understood = [
    item && `Item: ${item.label}`,
    brand && `Brand: ${brand}`,
    `Condition: ${condition.replace("_", " ").toLowerCase()}`,
    dailyRate !== undefined && `₹${dailyRate}/day`,
    deposit !== undefined && `Deposit ₹${deposit}`,
    salePrice !== undefined && `Sell for ₹${salePrice}`,
  ].filter(Boolean) as string[];

  return {
    transcript,
    title,
    description: transcript.trim(),
    brand,
    categorySlug: item?.category,
    condition,
    rentalEnabled: rentalEnabled || !purchaseEnabled,
    purchaseEnabled,
    dailyRate,
    deposit,
    salePrice,
    understood,
  };
}
