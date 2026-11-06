import type { NextConfig } from "next";

function hostOf(url: string | undefined) {
  try {
    return url ? new URL(url.trim()).hostname : undefined;
  } catch {
    console.warn("SUPABASE_URL is not a valid URL (expected https://<project>.supabase.co); remote images disabled");
    return undefined;
  }
}

const supabaseHost = hostOf(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL);

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Microphone is allowed for our own origin only (Borrowly Voice); camera and location stay off.
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: supabaseHost ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }] : [],
  },
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
