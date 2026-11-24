import { describe, expect, it } from "vitest";
import { folderName, slug } from "@/lib/studio/export";
import type { Project } from "@/lib/studio/db";

const project = (name: string, listing: "rent" | "sale" = "rent") => ({ id: "p", name, listing, createdAt: 0, updatedAt: 0, photoIds: [], exports: 0 }) as Project;

describe("download names", () => {
  it("keeps Latin names readable and drops punctuation", () => {
    expect(slug("Herzl 12, Ramat Gan!")).toBe("herzl-12-ramat-gan");
  });
  it("transliterates Hebrew so two properties don't collide", () => {
    expect(slug("הרצל 12, רמת גן")).toBe("hrtzl-12-rmt-gn");
    expect(slug("ביאליק 3")).not.toBe(slug("הרצל 12"));
  });
  it("starts with the date and the listing type, and leaves out the default name", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(folderName(project("הרצל 12", "sale"))).toBe(`${today}-sale-hrtzl-12`);
    expect(folderName(project("פרויקט חדש"), "פרויקט חדש")).toBe(`${today}-rent-dira-photos`);
    expect(folderName(project("  "))).toBe(`${today}-rent-dira-photos`);
  });
});
