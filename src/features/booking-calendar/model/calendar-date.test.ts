import { describe, expect, it } from "vitest";
import { addDays, dateFromManilaKey, localDateKey, localStart, startOfWeek } from "./calendar-date";

describe("Manila calendar dates", () => {
  it("keeps date keys and query boundaries in Manila when the instant crosses UTC midnight", () => {
    const instant = new Date("2026-09-24T16:30:00.000Z");
    const date = dateFromManilaKey(localDateKey(instant));
    expect(localDateKey(instant)).toBe("2026-09-25");
    expect(localDateKey(date)).toBe("2026-09-25");
    expect(new Date(localStart(date)).toISOString()).toBe("2026-09-24T16:00:00.000Z");
  });

  it("moves through Manila calendar days and starts weeks on Monday", () => {
    const friday = dateFromManilaKey("2026-09-25");
    expect(localDateKey(addDays(friday, 1))).toBe("2026-09-26");
    expect(localDateKey(startOfWeek(friday))).toBe("2026-09-21");
  });
});
