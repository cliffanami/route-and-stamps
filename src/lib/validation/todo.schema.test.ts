import { describe, expect, it } from "vitest";
import { todoSchema } from "./todo.schema";

function makeTodo(overrides: Partial<Parameters<typeof todoSchema.parse>[0]>) {
  return {
    text: "Apply for visa",
    due_date: null,
    related_place_id: null,
    phase: null,
    ...overrides,
  };
}

describe("todoSchema", () => {
  it("accepts a todo with just text", () => {
    const result = todoSchema.safeParse(makeTodo({}));
    expect(result.success).toBe(true);
  });

  it("rejects an empty text", () => {
    const result = todoSchema.safeParse(makeTodo({ text: "" }));
    expect(result.success).toBe(false);
  });

  it("rejects a whitespace-only text", () => {
    const result = todoSchema.safeParse(makeTodo({ text: "   " }));
    expect(result.success).toBe(false);
  });

  it("allows an optional due date", () => {
    const result = todoSchema.safeParse(makeTodo({ due_date: "2026-10-01" }));
    expect(result.success).toBe(true);
  });

  it("allows an optional related place", () => {
    const result = todoSchema.safeParse(
      makeTodo({ related_place_id: "11111111-1111-1111-1111-111111111111" }),
    );
    expect(result.success).toBe(true);
  });

  it("allows an optional phase", () => {
    const result = todoSchema.safeParse(makeTodo({ phase: "pre_trip" }));
    expect(result.success).toBe(true);
  });

  it("rejects an invalid phase value", () => {
    const result = todoSchema.safeParse(makeTodo({ phase: "mid_trip" }));
    expect(result.success).toBe(false);
  });

  it("allows both a related place and a phase together", () => {
    const result = todoSchema.safeParse(
      makeTodo({
        related_place_id: "11111111-1111-1111-1111-111111111111",
        phase: "during_trip",
      }),
    );
    expect(result.success).toBe(true);
  });
});
