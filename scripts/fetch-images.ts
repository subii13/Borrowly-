/**
 * Downloads freely licensed photographs from Wikimedia Commons, normalises them to
 * consistent 4:3 WebP files under public/images/, and records attribution in
 * public/images/credits.json.
 *
 *   npm run images:fetch               # fetch missing images
 *   npm run images:fetch -- --force    # re-fetch everything
 *   npm run images:fetch -- --only=tripod,canon-80d
 *   npm run images:fetch -- --candidates=tripod   # write a contact sheet of candidates
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { imageSlots, type ImageSlot } from "./image-manifest";

const API = "https://commons.wikimedia.org/w/api.php";
const UA = "BorrowlyDemoAssetFetcher/1.0 (https://github.com/subii13/Borrowly-)";
const ROOT = path.resolve(__dirname, "..", "public", "images");
const CREDITS = path.join(ROOT, "credits.json");
const ALLOWED_LICENSE = /^(cc0|public domain|pd|cc by(-sa)? [1-4]\.0|cc by(-sa)? 2\.5)/i;

type Candidate = {
  title: string;
  thumb: string;
  width: number;
  height: number;
  license: string;
  licenseUrl?: string;
  artist: string;
  page: string;
  quality: boolean;
};

type Credit = Omit<Candidate, "thumb" | "width" | "height" | "quality"> & { file: string; key: string };

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(params: Record<string, string>) {
  const url = `${API}?${new URLSearchParams({ format: "json", origin: "*", ...params })}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return res.json();
    await sleep(1500 * (attempt + 1));
  }
  throw new Error(`Commons API failed: ${url}`);
}

function toCandidate(page: any): Candidate | null {
  const info = page.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata ?? {};
  const license: string = meta.LicenseShortName?.value ?? "";
  if (!ALLOWED_LICENSE.test(license.trim())) return null;
  if (!/\.(jpe?g|png|webp)$/i.test(page.title)) return null;
  const ratio = info.width / info.height;
  if (info.width < 900 || ratio < 0.75 || ratio > 2.2) return null;
  return {
    title: page.title,
    thumb: info.thumburl ?? info.url,
    width: info.width,
    height: info.height,
    license: license.trim(),
    licenseUrl: meta.LicenseUrl?.value,
    artist: stripHtml(meta.Artist?.value ?? "Unknown") || "Unknown",
    page: info.descriptionurl,
    quality: /quality|featured|valued/i.test(meta.Assessments?.value ?? ""),
  };
}

async function candidates(slot: ImageSlot, limit = 20): Promise<Candidate[]> {
  const common = { prop: "imageinfo", iiprop: "url|size|extmetadata", iiurlwidth: "1600" };
  const data = slot.file
    ? await api({ action: "query", titles: slot.file, ...common })
    : await api({
        action: "query",
        generator: "search",
        gsrsearch: `filetype:bitmap ${slot.query}`,
        gsrnamespace: "6",
        gsrlimit: String(limit),
        ...common,
      });
  const pages = Object.values<any>(data.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  return pages.map(toCandidate).filter((c): c is Candidate => c !== null);
}

async function download(url: string): Promise<Buffer> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    await sleep(2000 * (attempt + 1));
  }
  throw new Error(`Download failed: ${url}`);
}

async function writeImage(buf: Buffer, slot: ImageSlot) {
  const dir = path.join(ROOT, slot.dir);
  await fs.mkdir(dir, { recursive: true });
  const w = slot.width ?? 1200;
  const h = slot.height ?? 900;
  const file = path.join(dir, `${slot.key}.webp`);
  await sharp(buf).flatten({ background: "#ffffff" }).rotate().resize(w, h, slot.fit === "contain" ? { fit: "contain", background: "#ffffff" } : { fit: "cover", position: sharp.strategy.attention }).webp({ quality: 80 }).toFile(file);
  // Detail crop used as the second gallery image for products.
  if (slot.dir === "products") {
    await sharp(buf)
      .rotate()
      .resize(Math.round(w * 1.7), Math.round(h * 1.7), { fit: "cover" })
      .extract({ left: Math.round(w * 0.35), top: Math.round(h * 0.35), width: w, height: h })
      .webp({ quality: 80 })
      .toFile(path.join(dir, `${slot.key}-detail.webp`));
  }
  return `/images/${slot.dir}/${slot.key}.webp`;
}

async function contactSheet(slot: ImageSlot) {
  const list = (await candidates(slot, 40)).slice(0, 12);
  if (!list.length) return console.log(`no candidates for ${slot.key}`);
  const tiles = await Promise.all(
    list.map(async (c, i) => {
      const img = await sharp(await download(c.thumb)).resize(400, 300, { fit: "cover" }).toBuffer();
      const label = Buffer.from(
        `<svg width="400" height="300"><rect width="40" height="30" fill="black"/><text x="8" y="22" font-size="20" fill="white">${i}</text></svg>`,
      );
      return sharp(img).composite([{ input: label }]).png().toBuffer();
    }),
  );
  const cols = 4;
  const rows = Math.ceil(tiles.length / cols);
  const out = path.resolve(__dirname, "..", ".local", `candidates-${slot.key}.png`);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await sharp({ create: { width: cols * 400, height: rows * 300, channels: 3, background: "#fff" } })
    .composite(tiles.map((t, i) => ({ input: t, left: (i % cols) * 400, top: Math.floor(i / cols) * 300 })))
    .png()
    .toFile(out);
  list.forEach((c, i) => console.log(i, c.title, c.license));
  console.log("Contact sheet:", out);
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const only = args.find((a) => a.startsWith("--only="))?.slice(7).split(",");
  const cand = args.find((a) => a.startsWith("--candidates="))?.slice(13).split(",");

  if (cand) {
    for (const key of cand) {
      const slot = imageSlots.find((s) => s.key === key);
      if (slot) await contactSheet(slot);
    }
    return;
  }

  const credits: Record<string, Credit> = JSON.parse(await fs.readFile(CREDITS, "utf8").catch(() => "{}"));
  for (const slot of imageSlots) {
    if (only && !only.includes(slot.key)) continue;
    const target = path.join(ROOT, slot.dir, `${slot.key}.webp`);
    const exists = await fs.access(target).then(() => true, () => false);
    if (exists && !force && !only) continue;
    try {
      const list = await candidates(slot);
      const chosen = list[slot.pick ?? 0];
      if (!chosen) {
        console.warn(`✗ ${slot.key}: no licensed candidate for "${slot.query}"`);
        continue;
      }
      const file = await writeImage(await download(chosen.thumb), slot);
      const { thumb, width, height, quality, ...credit } = chosen;
      credits[slot.key] = { key: slot.key, file, ...credit };
      console.log(`✓ ${slot.key} ← ${chosen.title} (${chosen.license})`);
      await sleep(400);
    } catch (err) {
      console.warn(`✗ ${slot.key}: ${(err as Error).message}`);
    }
  }
  const sorted = Object.fromEntries(Object.entries(credits).sort(([a], [b]) => a.localeCompare(b)));
  await fs.writeFile(CREDITS, JSON.stringify(sorted, null, 2) + "\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
