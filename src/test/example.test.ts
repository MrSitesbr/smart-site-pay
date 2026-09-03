import { describe, it, expect } from "vitest";
import { isActiveRecord, filterActiveRecords } from "@/lib/unit-status";

describe("unit visibility rule", () => {
  it("marks active records as enabled for public display", () => {
    expect(isActiveRecord({ status: "ativa" })).toBe(true);
    expect(isActiveRecord({ status: "active" })).toBe(true);
    expect(isActiveRecord({ status: "inativa" })).toBe(false);
    expect(isActiveRecord({ status: null })).toBe(true);
  });

  it("filters only active items for page widgets", () => {
    const rows = [
      { id: 1, status: "ativa" },
      { id: 2, status: "inativa" },
      { id: 3, status: "active" },
      { id: 4, status: null },
      { id: 5, status: "inactive" }
    ];

    expect(filterActiveRecords(rows)).toEqual([
      { id: 1, status: "ativa" },
      { id: 3, status: "active" },
      { id: 4, status: null }
    ]);
  });
});
