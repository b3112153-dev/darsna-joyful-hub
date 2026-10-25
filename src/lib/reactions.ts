export const REACTION_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🙏"] as const;

export type ReactionRow = { message_id: string; user_id: string; emoji: string };
export type ReactionGroup = { emoji: string; count: number; mine: boolean };

/** Group flat reaction rows of one message into chips, ordered by count then first-seen. */
export function groupReactions(rows: ReactionRow[], messageId: string, userId: string | undefined): ReactionGroup[] {
  const order = new Map<string, number>();
  const groups = new Map<string, ReactionGroup>();
  for (const row of rows) {
    if (row.message_id !== messageId) continue;
    if (!order.has(row.emoji)) order.set(row.emoji, order.size);
    const group = groups.get(row.emoji) ?? { emoji: row.emoji, count: 0, mine: false };
    group.count += 1;
    if (row.user_id === userId) group.mine = true;
    groups.set(row.emoji, group);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || (order.get(a.emoji) ?? 0) - (order.get(b.emoji) ?? 0));
}

/** Decide the toggle outcome: same emoji removes it, otherwise the new emoji replaces any of mine. */
export function reactionToggle(rows: ReactionRow[], messageId: string, userId: string, emoji: string): { remove: string[]; add: string | null } {
  const mine = rows.filter((row) => row.message_id === messageId && row.user_id === userId).map((row) => row.emoji);
  if (mine.includes(emoji)) return { remove: [emoji], add: null };
  return { remove: mine, add: emoji };
}

export const EDIT_WINDOW_MS = 15 * 60 * 1000;

/** Editing is allowed only within 15 minutes of sending; the database enforces it too. */
export function canEditNow(createdAt: string, now: number) {
  return now - new Date(createdAt).getTime() <= EDIT_WINDOW_MS;
}
