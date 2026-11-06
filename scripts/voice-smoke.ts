/**
 * Live round-trip check of the Gnani integration (spends a few programme credits):
 * Timbre speaks Tamil/Tanglish requests → Prisma transcribes them → Borrowly parses them.
 *
 *   npx tsx --env-file=.env scripts/voice-smoke.ts
 */
import { synthesize, transcribe } from "../src/modules/voice/gnani";
import { parseListingDraft, parseSearchIntent } from "../src/modules/voice/understand";
import { todayIST } from "../src/lib/dates";

const SEARCHES: [string, "ta-IN" | "en-IN"][] = [
  ["நாளைக்கு பீளமேட்டில் ஒரு கேமரா வாடகைக்கு வேண்டும், இரண்டு நாளுக்கு", "ta-IN"],
  ["I need a projector in RS Puram for one week under 1000 rupees", "en-IN"],
];
const LISTING = "Bosch drill, two batteries, nalla condition, oru naalukku 180 rupees, deposit 1500";

async function main() {
  if (!process.env.GNANI_API_KEY) throw new Error("Set GNANI_API_KEY in .env first");
  for (const [text, language] of SEARCHES) {
    const wav = await synthesize(text, { language, container: "wav" });
    const t = await transcribe(wav, { languages: "ta-IN,en-IN", format: "codemix" });
    console.log(`\nSpoken:   ${text}\nHeard:    ${t.text} (${t.language}, ${t.latencyMs} ms)`);
    console.log("Intent:  ", JSON.stringify(parseSearchIntent(t.text, todayIST(), t.language)));
  }
  const wav = await synthesize(LISTING, { language: "ta-IN", container: "wav" });
  const t = await transcribe(wav, { languages: "ta-IN,en-IN", format: "codemix" });
  console.log(`\nSpoken:   ${LISTING}\nHeard:    ${t.text}`);
  console.log("Draft:   ", JSON.stringify(parseListingDraft(t.text)));
}

main().catch((e) => {
  console.error("Voice smoke test failed:", e.message);
  process.exit(1);
});
