export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "UNAVAILABLE"
  | "RATE_LIMITED"
  | "PAYMENT_FAILED"
  | "INTERNAL";

const STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 400,
  CONFLICT: 409,
  UNAVAILABLE: 409,
  RATE_LIMITED: 429,
  PAYMENT_FAILED: 402,
  INTERNAL: 500,
};

/** An error whose message is safe to show to the user. */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
  get status() {
    return STATUS[this.code];
  }
}

export const notFound = (what = "Resource") => new AppError("NOT_FOUND", `${what} not found`);
export const forbidden = (msg = "You do not have permission to do that") => new AppError("FORBIDDEN", msg);
export const conflict = (msg: string) => new AppError("CONFLICT", msg);
export const invalid = (msg: string, fieldErrors?: Record<string, string>) => new AppError("VALIDATION", msg, fieldErrors);

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; code: ErrorCode; fieldErrors?: Record<string, string> };

/** Never leak internals: unknown errors become a generic message and are logged server-side. */
export function toSafeError(err: unknown): Extract<ActionResult, { ok: false }> {
  if (err instanceof AppError) return { ok: false, error: err.message, code: err.code, fieldErrors: err.fieldErrors };
  if (isZodError(err)) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".") || "_";
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, error: "Please check the highlighted fields", code: "VALIDATION", fieldErrors };
  }
  console.error("[borrowly] unexpected error", err);
  return { ok: false, error: "Something went wrong. Please try again.", code: "INTERNAL" };
}

function isZodError(err: unknown): err is { issues: { path: PropertyKey[]; message: string }[] } {
  return typeof err === "object" && err !== null && (err as { name?: string }).name === "ZodError";
}

export async function runAction<T>(fn: () => Promise<T>, message?: string): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn(), message };
  } catch (err) {
    if (isNextControlFlow(err)) throw err;
    return toSafeError(err);
  }
}

/** redirect()/notFound() throw special errors that must propagate. */
export function isNextControlFlow(err: unknown): boolean {
  const digest = (err as { digest?: unknown })?.digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK") || digest === "NEXT_NOT_FOUND");
}
