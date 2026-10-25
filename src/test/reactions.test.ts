import { describe, expect, it } from "vitest";
import { canEditNow, groupReactions, reactionToggle, REACTION_EMOJIS, EDIT_WINDOW_MS } from "@/lib/reactions";

const rows = [
  { message_id: "m1", user_id: "u1", emoji: "❤️" },
  { message_id: "m1", user_id: "u2", emoji: "❤️" },
  { message_id: "m1", user_id: "u2", emoji: "👍" },
  { message_id: "m2", user_id: "u1", emoji: "😂" },
];

describe("reactions", () => {
  it("offers exactly the 6 requested emojis", () => {
    expect(REACTION_EMOJIS).toEqual(["❤️", "👍", "😂", "😮", "😢", "🙏"]);
  });
  it("groups counts per message and flags mine", () => {
    const groups = groupReactions(rows, "m1", "u1");
    expect(groups.find((g) => g.emoji === "❤️")).toMatchObject({ count: 2, mine: true });
    expect(groups.find((g) => g.emoji === "👍")).toMatchObject({ count: 1, mine: false });
  });
  it("same emoji removes it", () => {
    expect(reactionToggle(rows, "m1", "u1", "❤️")).toEqual({ remove: ["❤️"], add: null });
  });
  it("new emoji replaces my existing ones", () => {
    expect(reactionToggle(rows, "m1", "u2", "😮")).toEqual({ remove: ["❤️", "👍"], add: "😮" });
  });
});

describe("edit window", () => {
  const now = new Date("2026-10-25T12:00:00Z").getTime();
  it("allows editing within 15 minutes", () => {
    expect(canEditNow("2026-10-25T11:50:00Z", now)).toBe(true);
  });
  it("blocks editing after 15 minutes", () => {
    expect(canEditNow(new Date(now - EDIT_WINDOW_MS - 1).toISOString(), now)).toBe(false);
  });
});
