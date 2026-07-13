import { describe, it, expect } from "vitest";
import { DAY_LABELS } from "@/features/clinics/types/index";

describe("DAY_LABELS (Round 1 regression)", () => {
  it("maps JS getDay() 0 to Sunday", () => {
    const sunday = new Date("2026-07-12"); // Sunday
    expect(DAY_LABELS[sunday.getDay()]).toBe("Sunday");
  });

  it("maps JS getDay() 1 to Monday", () => {
    const monday = new Date("2026-07-13");
    expect(DAY_LABELS[monday.getDay()]).toBe("Monday");
  });

  it("maps all 7 days correctly", () => {
    expect(DAY_LABELS[0]).toBe("Sunday");
    expect(DAY_LABELS[1]).toBe("Monday");
    expect(DAY_LABELS[2]).toBe("Tuesday");
    expect(DAY_LABELS[3]).toBe("Wednesday");
    expect(DAY_LABELS[4]).toBe("Thursday");
    expect(DAY_LABELS[5]).toBe("Friday");
    expect(DAY_LABELS[6]).toBe("Saturday");
  });

  it("has exactly 7 entries (no off-by-one)", () => {
    expect(Object.keys(DAY_LABELS)).toHaveLength(7);
  });
});
