import { describe, expect, it } from "vitest";
import { compareVersions } from "./updates";

describe("compareVersions", () => {
  it("orders semantic versions", () => {
    expect(compareVersions("0.2.0", "0.1.0")).toBeGreaterThan(0);
    expect(compareVersions("0.1.0", "0.2.0")).toBeLessThan(0);
    expect(compareVersions("1.0.0", "0.9.9")).toBeGreaterThan(0);
    expect(compareVersions("0.2.0", "0.2.0")).toBe(0);
    expect(compareVersions("0.2.1", "0.2.0")).toBeGreaterThan(0);
  });

  it("accepts v prefix and ignores pre-release suffixes", () => {
    expect(compareVersions("v0.2.0", "0.1.9")).toBeGreaterThan(0);
    expect(compareVersions("0.2.0-beta", "0.2.0")).toBe(0);
  });
});
