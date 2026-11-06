import { afterEach, describe, expect, it } from "vitest";
import { parseDay } from "@/lib/dates";
import { exploreUrl, parseListingDraft, parseSearchIntent, tokenize } from "@/modules/voice/understand";
import { bookingReply, searchReply, tamilNumber } from "@/modules/voice/reply";
import { isWav, setGnaniFetch, synthesize, transcribe } from "@/modules/voice/gnani";

const today = parseDay("2026-11-06"); // a Friday

describe("number words (Tamil script, Tanglish, English)", () => {
  it("folds spoken numbers into values", () => {
    const nums = (s: string) => tokenize(s).filter((t) => t.num !== undefined).map((t) => t.num);
    expect(nums("rendu aayiram rupees")).toEqual([2000]);
    expect(nums("மூன்று நாள்")).toEqual([3]);
    expect(nums("deposit 1,500 rs")).toEqual([1500]);
    expect(nums("ஐநூறு ரூபாய்")).toEqual([500]);
    expect(nums("two thousand five hundred")).toEqual([2500]);
    expect(nums("180rs")).toEqual([180]);
  });
});

describe("voice search intent", () => {
  it("understands Tanglish: item, area, tomorrow, duration", () => {
    const i = parseSearchIntent("Naalaiku oru DSLR camera venum, Peelamedu la, rendu naalukku", today);
    expect(i).toMatchObject({ q: "camera", area: "Peelamedu", mode: "rent", start: "2026-11-07", end: "2026-11-09", days: 2, tamil: true });
  });

  it("understands Tamil script with case suffixes", () => {
    const i = parseSearchIntent("நாளைக்கு பீளமேட்டில் ஒரு கேமரா வாடகைக்கு வேண்டும்", today);
    expect(i).toMatchObject({ q: "camera", area: "Peelamedu", mode: "rent", start: "2026-11-07", tamil: true });
  });

  it("understands English with a budget and a week", () => {
    const i = parseSearchIntent("I need a projector in RS Puram for one week under 1000 rupees", today, "en-IN");
    expect(i).toMatchObject({ q: "projector", area: "RS Puram", days: 7, max: 1000, tamil: false });
  });

  it("detects buying and the weekend", () => {
    expect(parseSearchIntent("second hand calculator vaanganum", today)).toMatchObject({ q: "calculator", mode: "buy" });
    expect(parseSearchIntent("weekend ku tent venum Saravanampatti", today)).toMatchObject({ q: "tent", area: "Saravanampatti", start: "2026-11-07", days: 2 });
  });

  it("falls back to leftover English words", () => {
    expect(parseSearchIntent("Nikon Z6 kidaikuma", today).q).toBe("nikon z6");
  });

  it("builds an explore URL with dates for the booking calendar", () => {
    const url = exploreUrl(parseSearchIntent("tomorrow drill Gandhipuram", today));
    expect(url).toContain("q=drill");
    expect(url).toContain("area=Gandhipuram");
    expect(url).toContain("start=2026-11-07");
    expect(url).toContain("voice=1");
  });
});

describe("speak-to-list draft", () => {
  it("extracts brand, item, condition and prices from a Tanglish description", () => {
    const d = parseListingDraft("Bosch drill machine, two batteries irukku, nalla condition, oru naalukku 180 rupees, deposit 1500, 4000 ku vikkiren");
    expect(d).toMatchObject({ title: "Bosch Drill", brand: "Bosch", categorySlug: "tools-diy", condition: "GOOD", dailyRate: 180, deposit: 1500, salePrice: 4000, rentalEnabled: true, purchaseEnabled: true });
  });

  it("handles Tamil script and like-new condition", () => {
    const d = parseListingDraft("Canon கேமரா, almost new, நாளுக்கு ஐநூறு ரூபாய்");
    expect(d).toMatchObject({ brand: "Canon", categorySlug: "cameras-photography", condition: "LIKE_NEW", dailyRate: 500, rentalEnabled: true, purchaseEnabled: false });
  });
});

describe("real Gnani Prisma v3.0 transcripts (captured 6 Nov 2026)", () => {
  it("matches areas despite ள/ல spelling swaps", () => {
    const i = parseSearchIntent("நாளைக்கு பீலமேட்டில் ஒரு camera வாடகைக்கு வேண்டும், இரண்டு நாளுக்கு.", today, "ta-IN");
    expect(i).toMatchObject({ q: "camera", area: "Peelamedu", mode: "rent", start: "2026-11-07", end: "2026-11-09", days: 2 });
  });

  it("reads a number before நாளைக்கு as a duration", () => {
    const i = parseSearchIntent("நாளைக்கு பீளமேட்டில் ஒரு camera வாடகைக்கு வேண்டும், இரண்டு நாளைக்கு.", today, "ta-IN");
    expect(i).toMatchObject({ start: "2026-11-07", days: 2, end: "2026-11-09" });
  });

  it("reads digits with thousand separators from English speech", () => {
    const i = parseSearchIntent("I need a projector in RS Puram for 1 week under 1,000 rupees.", today, "en-IN");
    expect(i).toMatchObject({ q: "projector", area: "RS Puram", days: 7, max: 1000 });
  });

  it("reads Tamil number words and spelling variants in a listing description", () => {
    const d = parseListingDraft("Bosch drill two batteries நல்ல condition ஒரு நாலுக்கூ நூற்றி எண்பது rupees. டிபாசிட் ஆயிரத்தி ஐந்நூறு.");
    expect(d).toMatchObject({ title: "Bosch Drill", categorySlug: "tools-diy", condition: "GOOD", dailyRate: 180, deposit: 1500, rentalEnabled: true });
  });
});

describe("spoken replies", () => {
  it("writes Tamil numbers as words", () => {
    expect(tamilNumber(3)).toBe("மூன்று");
    expect(tamilNumber(25)).toBe("இருபத்தி ஐந்து");
    expect(tamilNumber(900)).toBe("தொள்ளாயிரம்");
    expect(tamilNumber(1400)).toBe("ஆயிரத்து நானூறு");
    expect(tamilNumber(15000)).toBe("பதினைந்து ஆயிரம்");
    expect(tamilNumber(150000)).toBe("ஒரு லட்சத்து ஐம்பது ஆயிரம்");
  });

  it("composes Tamil and English search replies", () => {
    const first = { title: "Canon EOS 80D", dailyRatePaise: 90_000, salePricePaise: null, rentalEnabled: true };
    expect(searchReply({ tamil: true, total: 3, itemLabel: "camera", areaTa: "பீளமேடு", first })).toContain("ஒரு நாளுக்கு தொள்ளாயிரம் ரூபாய்");
    expect(searchReply({ tamil: false, total: 1, itemLabel: "camera", area: "Peelamedu", first })).toBe("I found 1 item for camera in Peelamedu. The first is Canon EOS 80D, at 900 rupees a day.");
    expect(searchReply({ tamil: true, total: 0, itemLabel: "tent" })).toContain("கிடைக்கவில்லை");
    expect(searchReply({ tamil: true, total: 0, itemLabel: "camera", areaTa: "பீளமேடு", elsewhere: 6 })).toContain("ஆறு கிடைக்கின்றன");
    expect(searchReply({ tamil: false, total: 0, itemLabel: "camera", area: "Peelamedu", elsewhere: 1 })).toContain("there is 1 match elsewhere");
    expect(bookingReply({ title: "JBL Flip", status: "REQUESTED", days: 3, totalPaise: 211_200 })).toContain("இரண்டு ஆயிரத்து நூற்றி பன்னிரண்டு ரூபாய்");
  });
});

describe("Gnani API client", () => {
  const original = process.env.GNANI_API_KEY;
  afterEach(() => {
    process.env.GNANI_API_KEY = original;
  });

  it("refuses to call the API without a key", async () => {
    delete process.env.GNANI_API_KEY;
    await expect(transcribe(Buffer.from("x"))).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });

  it("sends Prisma v3.0 multipart requests with the key header", async () => {
    process.env.GNANI_API_KEY = "test-key";
    let seen: { url: string; headers: Record<string, string>; form: FormData } | undefined;
    setGnaniFetch(async (url, init) => {
      seen = { url: String(url), headers: init!.headers as Record<string, string>, form: init!.body as FormData };
      return new Response(JSON.stringify({ success: true, transcript: " naalaiku camera venum ", detected_language_code: "ta-IN", model: "prisma-v3.0", end_to_end_latency: 0.66 }));
    });
    const t = await transcribe(Buffer.from("RIFF0000WAVEfmt "), { languages: "ta-IN,en-IN" });
    expect(t).toEqual({ text: "naalaiku camera venum", language: "ta-IN", model: "prisma-v3.0", latencyMs: 660 });
    expect(seen!.url).toBe("https://api.vachana.ai/stt/v3");
    expect(seen!.headers["X-API-Key-ID"]).toBe("test-key");
    expect(seen!.form.get("model")).toBe("prisma-v3.0");
    expect(seen!.form.get("language_code")).toBe("ta-IN,en-IN");
    expect(seen!.form.get("format")).toBe("codemix");
    expect(seen!.form.get("audio_file")).toBeInstanceOf(Blob);
  });

  it("sends Timbre requests and maps errors to safe messages", async () => {
    process.env.GNANI_API_KEY = "test-key";
    let body: Record<string, unknown> = {};
    setGnaniFetch(async (_url, init) => {
      body = JSON.parse(String(init!.body));
      return new Response(new Uint8Array([1, 2, 3]));
    });
    expect(await synthesize("வணக்கம்", { language: "ta-IN" })).toHaveLength(3);
    expect(body).toMatchObject({ model: "timbre-v3.0", language: "ta-IN", voice: "Lakshmi" });

    const orig = console.error;
    console.error = () => {};
    setGnaniFetch(async () => new Response("{}", { status: 402 }));
    await expect(synthesize("x")).rejects.toMatchObject({ message: "Voice credits are used up for now." });
    console.error = orig;
  });

  it("only accepts WAV uploads", () => {
    const wav = new Uint8Array(64);
    wav.set([82, 73, 70, 70], 0);
    wav.set([87, 65, 86, 69], 8);
    expect(isWav(wav)).toBe(true);
    expect(isWav(new Uint8Array(64))).toBe(false);
  });
});
