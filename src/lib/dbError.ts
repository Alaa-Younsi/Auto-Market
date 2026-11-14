/**
 * supabase-js rejects with a PostgrestError that is a plain object, NOT an
 * Error instance (verified against the installed version) — so
 * `err instanceof Error ? err.message : null` silently drops the message.
 * That once made every checkout failure show the generic error instead of
 * "out of stock" / "wilaya not served". Always read errors through this.
 */
export function readDbError(err: unknown): { code: string; message: string } {
  if (err && typeof err === "object") {
    const e = err as { code?: unknown; message?: unknown };
    return {
      code: typeof e.code === "string" ? e.code : "",
      message: typeof e.message === "string" ? e.message : "",
    };
  }
  return { code: "", message: typeof err === "string" ? err : "" };
}
