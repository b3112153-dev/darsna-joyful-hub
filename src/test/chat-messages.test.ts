import { describe, expect, it } from "vitest";
import { MESSAGE_PAGE_SIZE, mergeMessage, removeMessage, orderedMessages, canDeleteMessage, canEditMessage, type Message, type MessageCache } from "@/lib/chat-messages";

const message = (id: string, created_at = "2026-10-24T12:00:00Z"): Message => ({
  id, created_at, content: id, deleted_at: null, deleted_by: null, edited_at: null, from_admin: false,
  image_path: null, reply_to: null, room_id: "room", sender_role: null, user_id: "student", profiles: null,
});
const cache = (): MessageCache => ({ pages: [
  { messages: [message("recent", "2026-10-24T13:00:00Z")], next: { created_at: "2026-10-24T13:00:00Z", id: "recent" } },
  { messages: [message("older")], next: null },
], pageParams: [null, { created_at: "2026-10-24T13:00:00Z", id: "recent" }] });

describe("Chat history", () => {
  it("requests 50 messages per page", () => expect(MESSAGE_PAGE_SIZE).toBe(50));
  it("preserves older pages when a new message arrives", () => {
    expect(orderedMessages(mergeMessage(cache(), message("new", "2026-10-24T14:00:00Z"))).map((row) => row.id)).toEqual(["older", "recent", "new"]);
  });
  it("merges duplicate realtime events once", () => {
    const updated = mergeMessage(cache(), message("new"));
    expect(orderedMessages(mergeMessage(updated, message("new"))).filter((row) => row.id === "new")).toHaveLength(1);
  });
  it("hides soft deleted messages in every page", () => {
    expect(orderedMessages(mergeMessage(cache(), { ...message("older"), deleted_at: "2026-10-24T14:00:00Z" })).map((row) => row.id)).toEqual(["recent"]);
  });
  it("restores a failed deletion without losing concurrent arrivals", () => {
    const removed = removeMessage(cache(), "older");
    const concurrent = mergeMessage(removed, message("new", "2026-10-24T14:00:00Z"));
    expect(orderedMessages(mergeMessage(concurrent, message("older"))).map((row) => row.id)).toEqual(["older", "recent", "new"]);
  });
  it("updates content without removing older history", () => {
    const rows = orderedMessages(mergeMessage(cache(), { ...message("older"), content: "edited" }));
    expect(rows).toHaveLength(2);
    expect(rows[0]?.content).toBe("edited");
  });
  it("allows deletion by the owner", () => expect(canDeleteMessage(message("1"), "student", undefined)).toBe(true));
  it("allows staff to delete others' messages", () => expect(canDeleteMessage(message("1"), "staff", { isAdmin: true })).toBe(true));
  it("does not allow students to delete others' messages", () => expect(canDeleteMessage(message("1"), "other", undefined)).toBe(false));
  it("allows editing only by the message owner", () => {
    expect(canEditMessage(message("1"), "student")).toBe(true);
    expect(canEditMessage(message("1"), "staff")).toBe(false);
  });
});