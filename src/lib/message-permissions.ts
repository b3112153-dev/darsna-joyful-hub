export type MessageActor = { isAdmin?: boolean; isOwner?: boolean; roles?: string[] } | undefined;
export function canDeleteEntry(senderId: string, senderRole: string | null, fromAdmin: boolean, userId: string | undefined, actor: MessageActor, studentChat = true) {
  if (!userId) return false;
  if (actor?.isAdmin || actor?.isOwner) return true;
  if (actor?.roles?.includes("moderator")) return studentChat && !fromAdmin && !["admin", "moderator", "support"].includes(senderRole ?? "");
  return senderId === userId;
}
export function canDeleteContent(actor: MessageActor) { return !!(actor?.isAdmin || actor?.isOwner); }