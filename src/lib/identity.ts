import type { AvatarState } from "@/hooks/use-wallet";
import type { Json } from "@/integrations/supabase/types";

export type PublicProfile = { id?: string; nickname?: string | null; avatar?: Json | AvatarState; gender?: string | null; display_name?: string | null };
export function profileAvatar(profile: PublicProfile | null | undefined): AvatarState {
  const raw = profile?.avatar;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}
export const PROFILE_FIELDS = "id,display_name,nickname,avatar,avatar_url,branch,gender,generation,onboarded_v2,created_at,nickname_changed_at";
export function profileName(profile: PublicProfile | null | undefined, staff = false) {
  return (staff ? profile?.display_name || profile?.nickname : profile?.nickname) || "Student";
}
export function latinDigits(text: string) {
  return text.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (digit) => String(digit.charCodeAt(0) - (digit.charCodeAt(0) >= 0x6f0 ? 0x6f0 : 0x660)));
}
type RoomIdentity = { id: string; generation: string; audience: string; kind: string };
export function studentChatRooms<T extends RoomIdentity>(rooms: T[], generation: string | null | undefined, gender: string | null | undefined) {
  const chat = rooms.find((r) => !!generation && !!gender && r.generation === generation && r.kind === "chat" && r.audience === gender);
  const shared = rooms.filter((r) => r.kind === "chat" && ["all", "mixed", "shared"].includes(r.audience));
  return {
    chat,
    round: shared.find((r) => r.generation === "tawjihi") ?? shared[0],
  };
}
export function chatAccess(me: { isOwner?: boolean; isAdmin?: boolean; isStaff?: boolean; isSupport?: boolean } | undefined) {
  const privileged = !!(me?.isOwner || me?.isAdmin || me?.isSupport);
  return { staff: privileged || !!me?.isStaff, support: privileged, review: privileged, mute: !!(me?.isStaff || me?.isOwner) };
}