import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Without this, each render() in a test file stays mounted for the rest of
// that file — RTL's auto-cleanup only self-registers when it detects a
// global afterEach, which we don't have since test files import explicitly
// rather than relying on Vitest's `globals: true`.
afterEach(cleanup);
