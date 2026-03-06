import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, utcToLocal } from "./date";

describe("utcToLocal", () => {
  it("appends Z to naive ISO strings", () => {
    const d = utcToLocal("2026-03-01T12:00:00");
    // Should be treated as UTC, not local
    expect(d.getUTCHours()).toBe(12);
  });

  it("leaves Z-suffixed strings unchanged", () => {
    const d = utcToLocal("2026-03-01T12:00:00Z");
    expect(d.getUTCHours()).toBe(12);
  });

  it("handles fractional seconds", () => {
    const d = utcToLocal("2026-03-01T12:00:00.123456");
    expect(d.getUTCHours()).toBe(12);
    expect(d.getUTCMilliseconds()).toBe(123);
  });
});

describe("formatDateTime", () => {
  it("returns a locale-formatted date+time string", () => {
    const result = formatDateTime("2026-03-01T12:00:00");
    // Just check it's a non-empty string (locale varies)
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });
});

describe("formatDate", () => {
  it("returns a locale-formatted date string", () => {
    const result = formatDate("2026-03-01T12:00:00");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });
});
