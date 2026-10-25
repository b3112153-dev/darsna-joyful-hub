import { describe, expect, it } from "vitest";
import { chatAccess, latinDigits, profileName, studentChatRooms, PROFILE_FIELDS } from "@/lib/identity";
import { fmtMin } from "@/lib/plan";
import { inboxUnread } from "@/hooks/use-support-inbox";
import { imageFor } from "@/hooks/use-avatar";
import { profileAvatar } from "@/lib/identity";

describe("student presentation rules", () => {
  it("never exposes a real name to students without a nickname", () => {
    expect(profileName({ display_name: "Private name", nickname: null })).toBe("Student");
    expect(profileName({ display_name: "Private name", nickname: "Moon" })).toBe("Moon");
  });
  it("permits staff to see real names", () => expect(profileName({ display_name: "Private name", nickname: "Moon" }, true)).toBe("Private name"));
  it("selects only the same generation and gender plus shared room", () => {
    const rooms = [
      { id: "mine", kind: "chat", generation: "gen2009", audience: "female" },
      { id: "other-gender", kind: "chat", generation: "gen2009", audience: "male" },
      { id: "other-year", kind: "chat", generation: "gen2010", audience: "female" },
      { id: "round", kind: "chat", generation: "gen2009", audience: "all" },
    ];
    expect(studentChatRooms(rooms, "gen2009", "female")).toEqual({ chat: rooms[0], round: rooms[3] });
    expect(studentChatRooms(rooms, null, null)).toEqual({ chat: undefined, round: undefined });
  });
  it("moderators cannot open support or review", () => expect(chatAccess({ isStaff: true })).toEqual({ staff: true, support: false, review: false, mute: true }));
  it("support can open support and review but cannot mute", () => expect(chatAccess({ isSupport: true })).toEqual({ staff: true, support: true, review: true, mute: false }));
  it("converts both Arabic digit alphabets to Latin", () => expect(latinDigits(String.fromCharCode(...Array.from({ length: 10 }, (_, i) => 0x660 + i)) + " " + String.fromCharCode(...Array.from({ length: 10 }, (_, i) => 0x6f0 + i)))).toBe("0123456789 0123456789"));
  it("formats study-plan counters with Latin numbers", () => expect(fmtMin(9 * 60 + 5)).toBe("9:05"));
  it("uses the sender's gender to resolve a chosen outfit", () => {
    const profile = { nickname: "Moon", gender: "female", avatar: { outfit: "it00", hair: "it18" } };
    expect(profileAvatar(profile)).toEqual({ outfit: "it00", hair: "it18" });
    expect(imageFor({ "it00:female": "girl.png", "it00:male": "boy.png" }, "it00", "outfit", profile.gender)).toBe("girl.png");
  });
  it("marks only new student messages unread after a local read", () => {
    const row = { id: "m", student_id: "s", sender_id: "s", content: "hello", created_at: "2026-10-25T10:00:00Z", profiles: null };
    expect(inboxUnread(row, {})).toBe(true);
    expect(inboxUnread(row, { s: row.created_at })).toBe(false);
    expect(inboxUnread({ ...row, sender_id: "staff" }, {})).toBe(false);
  });
  it("excludes all private profile fields", () => {
    expect(PROFILE_FIELDS.split(",")).not.toContain("birth_date");
    expect(PROFILE_FIELDS.split(",")).not.toContain("terms_accepted_at");
    expect(PROFILE_FIELDS.split(",")).not.toContain("terms_version");
  });
});