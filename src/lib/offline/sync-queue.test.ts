import { describe, expect, it, vi, afterEach } from "vitest";
import { isNetworkError } from "./sync-queue";

describe("isNetworkError", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is true when the browser reports offline, regardless of error type", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(isNetworkError(new Error("anything"))).toBe(true);
  });

  it("is true for a TypeError (fetch-layer failure) while online", () => {
    vi.stubGlobal("navigator", { onLine: true });
    expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
  });

  it("is false for a non-network error while online", () => {
    vi.stubGlobal("navigator", { onLine: true });
    expect(isNetworkError(new Error("row violates RLS policy"))).toBe(false);
  });

  // Regression test: supabase-js's PostgrestBuilder catches a fetch-layer
  // TypeError and re-wraps it into a plain { message, details, hint, code }
  // object rather than re-throwing the TypeError itself — confirmed by
  // instrumenting a real offline mutation against production. The original
  // `error instanceof TypeError` check silently never matched this real
  // shape, so every offline write failed instead of queueing.
  it("is true for supabase-js's plain-object network-failure shape", () => {
    vi.stubGlobal("navigator", { onLine: true });
    expect(
      isNetworkError({
        message: "TypeError: Failed to fetch",
        details: "",
        hint: "",
        code: "",
      }),
    ).toBe(true);
  });

  // Real Supabase errors (RLS rejection, bad input) share that exact same
  // { message, details, hint, code } shape — only the message content
  // differs, so the check must not just be "is this shape present."
  it("is false for a plain-object error whose message isn't network-related", () => {
    vi.stubGlobal("navigator", { onLine: true });
    expect(
      isNetworkError({
        message: "new row violates row-level security policy",
        details: "",
        hint: "",
        code: "42501",
      }),
    ).toBe(false);
  });
});
