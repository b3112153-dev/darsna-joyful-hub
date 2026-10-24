import type { InfiniteData } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

export const MESSAGE_PAGE_SIZE = 50;
export type Message = Database["public"]["Tables"]["messages"]["Row"] & {
  profiles: { display_name: string; avatar_url: string | null } | null;
};
export type MessageCursor = { created_at: string; id: string } | null;
export type MessagePage = { messages: Message[]; next: MessageCursor };
export type MessageCache = InfiniteData<MessagePage, MessageCursor>;

export function mergeMessage(cache: MessageCache | undefined, message: Message): MessageCache | undefined {
  if (!cache) return cache;
  const exists = cache.pages.some((page) => page.messages.some((item) => item.id === message.id));
  return {
    ...cache,
    pages: cache.pages.map((page, index) => ({
      ...page,
      messages: message.deleted_at
        ? page.messages.filter((item) => item.id !== message.id)
        : exists
          ? page.messages.map((item) => item.id === message.id ? message : item)
          : index === 0 ? [message, ...page.messages] : page.messages,
    })),
  };
}

export function removeMessage(cache: MessageCache | undefined, id: string): MessageCache | undefined {
  if (!cache) return cache;
  return { ...cache, pages: cache.pages.map((page) => ({ ...page, messages: page.messages.filter((message) => message.id !== id) })) };
}

export function orderedMessages(cache: MessageCache | undefined): Message[] {
  const unique = new Map<string, Message>();
  cache?.pages.forEach((page) => page.messages.forEach((message) => {
    if (!message.deleted_at) unique.set(message.id, message);
  }));
  return [...unique.values()].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

export function canDeleteMessage(message: Message, userId: string | undefined, staff: boolean) {
  return message.user_id === userId || staff;
}

export function canEditMessage(message: Message, userId: string | undefined) {
  return message.user_id === userId;
}