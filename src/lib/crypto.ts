import { createHash, randomBytes } from "node:crypto";

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
/** Human-friendly reference codes, e.g. BR-7KQ2MX. */
export function referenceCode(prefix: string, length = 6): string {
  const bytes = randomBytes(length);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `${prefix}-${out}`;
}

export const numericCode = (digits = 6) => String(randomBytes(4).readUInt32BE(0) % 10 ** digits).padStart(digits, "0");
