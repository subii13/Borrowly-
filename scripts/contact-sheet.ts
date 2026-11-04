/** Dev helper: renders every fetched image into one labelled grid for visual review (.local/contact-sheet.png). */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { imageSlots } from "./image-manifest";

async function main() {
  const filter = process.argv[2]?.split(",");
  const slots = imageSlots.filter((s) => !filter || filter.includes(s.key));
  const W = 300, H = 225, cols = 6;
  const tiles = [];
  for (const [i, s] of slots.entries()) {
    const file = path.resolve(__dirname, "..", "public", "images", s.dir, `${s.key}.webp`);
    const img = await sharp(file).resize(W, H).toBuffer().catch(() => null);
    if (!img) continue;
    const label = Buffer.from(`<svg width="${W}" height="${H}"><rect y="${H - 26}" width="${W}" height="26" fill="black" opacity="0.7"/><text x="6" y="${H - 8}" font-size="16" font-family="Arial" fill="white">${s.key}</text></svg>`);
    tiles.push({ input: await sharp(img).composite([{ input: label }]).png().toBuffer(), left: (i % cols) * W, top: Math.floor(i / cols) * H });
  }
  const out = path.resolve(__dirname, "..", ".local", "contact-sheet.png");
  await fs.mkdir(path.dirname(out), { recursive: true });
  await sharp({ create: { width: cols * W, height: Math.ceil(slots.length / cols) * H, channels: 3, background: "#fff" } }).composite(tiles).png().toFile(out);
  console.log(out);
}
main();
