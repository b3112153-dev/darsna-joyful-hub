import { describe, expect, it } from "vitest";
import { chatAccess, latinDigits, profileName, studentChatRooms, PROFILE_FIELDS } from "@/lib/identity";

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
  it("converts both Arabic digit alphabets to Latin", () => expect(latinDigits("٠١٢٣٤٥٦٧٨٩ ۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789 0123456789"));
  it("excludes all private profile fields", () => {
    expect(PROFILE_FIELDS.split(",")).not.toContain("birth_date");
    expect(PROFILE_FIELDS.split(",")).not.toContain("terms_accepted_at");
    expect(PROFILE_FIELDS.split(",")).not.toContain("terms_version");
  });
});