import { getObject } from "@/lib/storage";

/** Serves public uploads (listing photos) from local storage. Private evidence is never served here. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (!key.startsWith("listings/") && !key.startsWith("avatars/")) return new Response("Not found", { status: 404 });
  const data = await getObject(key, "public").catch(() => null);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
