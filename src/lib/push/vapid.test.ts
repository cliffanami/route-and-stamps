import { describe, expect, it } from "vitest";
import { urlBase64ToUint8Array } from "./vapid";

describe("urlBase64ToUint8Array", () => {
  it("decodes a URL-safe base64 string to bytes matching atob's output", () => {
    // "hello" base64-encoded, with a URL-safe substitution forced in so
    // the -/_ replacement path is actually exercised, not just padding.
    const standard = btoa("hello");
    const urlSafe = standard.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const result = urlBase64ToUint8Array(urlSafe);
    const decoded = new TextDecoder().decode(result);
    expect(decoded).toBe("hello");
  });

  it("handles strings needing each possible padding length", () => {
    for (const input of ["a", "ab", "abc", "abcd"]) {
      const base64 = btoa(input).replace(/=+$/, "");
      const result = urlBase64ToUint8Array(base64);
      expect(new TextDecoder().decode(result)).toBe(input);
    }
  });
});
