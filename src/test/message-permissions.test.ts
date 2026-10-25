import { describe, expect, it } from "vitest";
import { canDeleteEntry, canDeleteContent } from "@/lib/message-permissions";
import { CHAT_IMAGE_LIMIT, validateChatImage, chatImagePath } from "@/lib/chat-images";
describe("message deletion permissions", () => {
  it("admin can delete staff messages everywhere", () => expect(canDeleteEntry("staff", "support", false, "admin", { isAdmin: true }, false)).toBe(true));
  it("owner can delete all content", () => expect(canDeleteContent({ isOwner: true })).toBe(true));
  it("moderator can delete student chat comments", () => expect(canDeleteEntry("student", null, false, "mod", { roles: ["moderator"] })).toBe(true));
  it("moderator cannot delete any staff messages including their own", () => { for (const role of ["admin", "support", "moderator"]) expect(canDeleteEntry("mod", role, false, "mod", { roles: ["moderator"] })).toBe(false); });
  it("moderator cannot delete private support messages", () => expect(canDeleteEntry("student", null, false, "mod", { roles: ["moderator"] }, false)).toBe(false));
  it("moderator cannot delete files or quizzes", () => expect(canDeleteContent({ roles: ["moderator"] })).toBe(false));
  it("support can delete only their own messages", () => { expect(canDeleteEntry("support", "support", false, "support", { roles: ["support"] }, false)).toBe(true); expect(canDeleteEntry("student", null, false, "support", { roles: ["support"] }, false)).toBe(false); });
  it("support cannot delete content", () => expect(canDeleteContent({ roles: ["support"] })).toBe(false));
});
describe("chat image rules", () => {
  it("accepts the four image formats up to 5MB", () => { expect(CHAT_IMAGE_LIMIT).toBe(5242880); for (const type of ["image/png", "image/jpeg", "image/webp", "image/gif"]) expect(validateChatImage({ type, size: 5242880 })).toBeNull(); });
  it("rejects images above 5MB", () => expect(validateChatImage({ type: "image/png", size: 5242881 })).not.toBeNull());
  it("rejects unsupported image formats", () => expect(validateChatImage({ type: "image/svg+xml", size: 12 })).not.toBeNull());
  it("uploads under the sender id with a unique image name", () => expect(chatImagePath("student", "uuid", "image/jpeg")).toBe("student/uuid.jpg"));
});