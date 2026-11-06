import "server-only";

/** Server-side environment. Secrets are never exposed with a NEXT_PUBLIC_ prefix. */
export const env = {
  isProd: process.env.NODE_ENV === "production",
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  /** Enables the one-click demo sign-in and the admin "reset demo data" tool. */
  demoMode: process.env.DEMO_MODE === "true",
  supabaseUrl: (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim() || undefined,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  publicBucket: process.env.SUPABASE_PUBLIC_BUCKET ?? "listing-images",
  privateBucket: process.env.SUPABASE_PRIVATE_BUCKET ?? "evidence",
  localStorageDir: process.env.LOCAL_STORAGE_DIR ?? ".data",
  paymentProvider: process.env.PAYMENT_PROVIDER ?? "demo",
  /** Gnani AI (Vachana) API key for Prisma speech-to-text and Timbre text-to-speech. Server-only. */
  gnaniApiKey: process.env.GNANI_API_KEY?.trim() || undefined,
};

export const storageMode = () => (env.supabaseUrl && env.supabaseServiceRoleKey ? "supabase" : "local");
