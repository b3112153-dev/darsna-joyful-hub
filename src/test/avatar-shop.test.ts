import { describe, expect, it } from "vitest";
import { BOARD_PRIZES, itemState, weekDaysLeft } from "@/lib/avatar-shop";

const wallet = { balance: 40, level: 1, owned: ["it01"], avatar: { outfit: "it00" } };

describe("weekly board prizes", () => {
  it("pays 100/80/65 to the top 3", () => {
    expect(BOARD_PRIZES[1]).toBe(100);
    expect(BOARD_PRIZES[2]).toBe(80);
    expect(BOARD_PRIZES[3]).toBe(65);
  });
  it("pays 50,40,30,25,20,15,10 to ranks 4..10 and nothing after", () => {
    expect([4, 5, 6, 7, 8, 9, 10].map((r) => BOARD_PRIZES[r])).toEqual([50, 40, 30, 25, 20, 15, 10]);
    expect(BOARD_PRIZES[11]).toBeUndefined();
  });
});

describe("weekDaysLeft (Saturday..Friday)", () => {
  it("is 6 on Saturday and 0 on Friday", () => {
    expect(weekDaysLeft(6)).toBe(6); // Saturday
    expect(weekDaysLeft(5)).toBe(0); // Friday
    expect(weekDaysLeft(0)).toBe(5); // Sunday
  });
});

describe("itemState", () => {
  it("marks the worn item", () => {
    expect(itemState({ id: "it00", category: "outfit", price: 0, level_req: 1 }, wallet)).toBe("worn");
  });
  it("treats price 0 as owned", () => {
    expect(itemState({ id: "it02", category: "outfit", price: 0, level_req: 1 }, wallet)).toBe("wear");
  });
  it("treats owned items as wearable", () => {
    expect(itemState({ id: "it01", category: "outfit", price: 90, level_req: 4 }, wallet)).toBe("wear");
  });
  it("locks items above the user's level", () => {
    expect(itemState({ id: "it03", category: "outfit", price: 10, level_req: 4 }, wallet)).toBe("locked");
  });
  it("blocks purchase when balance is insufficient", () => {
    expect(itemState({ id: "it03", category: "outfit", price: 90, level_req: 1 }, wallet)).toBe("poor");
  });
  it("allows purchase with enough level and balance", () => {
    expect(itemState({ id: "it03", category: "outfit", price: 40, level_req: 1 }, wallet)).toBe("buy");
  });
});
