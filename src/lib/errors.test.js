import { describe, it, expect } from "vitest";
import { handleApiError } from "./errors";

describe("handleApiError", () => {
  it("returns fallback for system-level errors", () => {
    const systemErrors = [
      new TypeError("Failed to fetch"),
      new Error("NetworkError"),
      new Error("Failed to fetch dynamically imported module: https://example.com/chunk.js"),
      new Error("TypeError: Cannot read properties of undefined"),
      new SyntaxError("JSON.parse: unexpected token"),
      new Error("Loading chunk 123 failed"),
      new Error("Unexpected token '<'"),
    ];
    for (const err of systemErrors) {
      const result = handleApiError(err, "Failed to load");
      expect(result).toBe("Failed to load Please try again.");
    }
  });

  it("preserves user-friendly service messages", () => {
    const friendlyErrors = [
      "Doctor already has an appointment with John Doe at 09:00-09:30 on this date",
      "Cannot transition from completed to scheduled",
      "Patient already exists with this phone number",
      "Appointment not found",
      "No available slots on this date",
    ];
    for (const msg of friendlyErrors) {
      const result = handleApiError(new Error(msg), "Something went wrong");
      expect(result).toBe(msg);
    }
  });

  it("handles null/undefined error gracefully", () => {
    expect(handleApiError(null, "Failed")).toBe("Failed Please try again.");
    expect(handleApiError(undefined, "Failed")).toBe("Failed Please try again.");
    expect(handleApiError({}, "Failed")).toBe("Failed Please try again.");
  });

  it("uses default fallback when none provided", () => {
    const result = handleApiError(new Error("TypeError: x is undefined"));
    expect(result).toBe("Something went wrong. Please try again.");
  });
});
