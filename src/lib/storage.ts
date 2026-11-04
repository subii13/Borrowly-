import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { env, storageMode } from "./env";
import { invalid } from "./errors";
import { randomToken } from "./crypto";

export type Visibility = "public" | "private";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 1600;

/** Detects the real file type from magic bytes — the browser-supplied MIME type is not trusted. */
export function sniffImageType(buf: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  const riff = String.fromCharCode(...buf.slice(0, 4));
  const webp = String.fromCharCode(...buf.slice(8, 12));
  if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  return null;
}

/**
 * Validates and re-encodes an uploaded image: checks size and magic bytes, decodes it,
 * bounds its dimensions and strips metadata (EXIF/GPS) by re-encoding to WebP.
 */
export async function processImage(input: Buffer) {
  if (input.byteLength > MAX_UPLOAD_BYTES) throw invalid("Images must be 5 MB or smaller");
  if (!sniffImageType(input)) throw invalid("Only JPEG, PNG or WebP images are allowed");
  try {
    const { data, info } = await sharp(input, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height, contentType: "image/webp" as const };
  } catch {
    throw invalid("That file could not be read as an image");
  }
}

export function newStorageKey(scope: string, ownerId: string) {
  return `${scope}/${ownerId}/${Date.now().toString(36)}-${randomToken(9)}.webp`;
}

const SAFE_KEY = /^[a-z-]+\/[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/;
const localPath = (key: string, visibility: Visibility) => {
  if (!SAFE_KEY.test(key)) throw invalid("Invalid storage key");
  return path.resolve(process.cwd(), env.localStorageDir, visibility, key);
};

/** Public URL for a stored public object. Local files are served by /api/media. */
export function publicUrl(key: string): string {
  if (storageMode() === "supabase") return `${env.supabaseUrl}/storage/v1/object/public/${env.publicBucket}/${key}`;
  return `/api/media/${key}`;
}

function supabaseObjectUrl(key: string, visibility: Visibility) {
  const bucket = visibility === "public" ? env.publicBucket : env.privateBucket;
  return `${env.supabaseUrl}/storage/v1/object/${bucket}/${key}`;
}

const authHeaders = () => ({ Authorization: `Bearer ${env.supabaseServiceRoleKey}`, apikey: env.supabaseServiceRoleKey! });

export async function putObject(key: string, data: Buffer, contentType: string, visibility: Visibility) {
  if (storageMode() === "supabase") {
    const res = await fetch(supabaseObjectUrl(key, visibility), {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": contentType, "x-upsert": "false" },
      body: new Uint8Array(data),
    });
    if (!res.ok) throw new Error(`Storage upload failed (${res.status})`);
    return;
  }
  const file = localPath(key, visibility);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data);
}

export async function getObject(key: string, visibility: Visibility): Promise<Buffer | null> {
  if (storageMode() === "supabase") {
    const res = await fetch(supabaseObjectUrl(key, visibility), { headers: authHeaders() });
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  }
  return fs.readFile(localPath(key, visibility)).catch(() => null);
}

export async function deleteObject(key: string, visibility: Visibility) {
  if (storageMode() === "supabase") {
    await fetch(supabaseObjectUrl(key, visibility), { method: "DELETE", headers: authHeaders() }).catch(() => {});
    return;
  }
  await fs.rm(localPath(key, visibility), { force: true });
}

export async function storeImage(input: Buffer, scope: "listings" | "evidence" | "disputes" | "avatars", ownerId: string) {
  const img = await processImage(input);
  const visibility: Visibility = scope === "listings" || scope === "avatars" ? "public" : "private";
  const key = newStorageKey(scope, ownerId);
  await putObject(key, img.data, img.contentType, visibility);
  return { key, width: img.width, height: img.height, url: visibility === "public" ? publicUrl(key) : null };
}
