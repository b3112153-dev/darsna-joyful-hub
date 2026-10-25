import type { AvatarState } from "@/hooks/use-wallet";

export type PublicProfile = { id?: string; nickname?: string | null; avatar?: AvatarState | null; gender?: string | null; display_name?: string | null };
export const PROFILE_FIELDS = "id,display_name,nickname,avatar,avatar_url,branch,gender,generation,onboarded_v2,created_at,nickname_changed_at";
export function profileName(profile: PublicProfile | null | undefined, staff = false) {
  return (staff ? profile?.display_name || profile?.nickname : profile?.nickname) || "Student";
}
export function latinDigits(text: string) {
  return text.replace(/[٠-٩۰-۹]/g, (digit) => String(digit.charCodeAt(0) - (digit >= "۰" ? 0x6f0 : 0x660)));
}
type RoomIdentity = { id: string; generation: string; audience: string; kind: string };
export function studentChatRooms<T extends RoomIdentity>(rooms: T[], generation: string | null | undefined, gender: string | null | undefined) {
  const sameGeneration = rooms.filter((r) => !!generation && r.generation === generation && r.kind === "chat");
  return {
    chat: sameGeneration.find((r) => !!gender && r.audience === gender),
    round: sameGeneration.find((r) => ["all", "mixed", "shared"].includes(r.audience)),
  };
}
export function chatAccess(me: { isOwner?: boolean; isAdmin?: boolean; isStaff?: boolean; isSupport?: boolean } | undefined) {
  const privileged = !!(me?.isOwner || me?.isAdmin || me?.isSupport);
  return { staff: privileged || !!me?.isStaff, support: privileged, review: privileged, mute: !!(me?.isStaff || me?.isOwner) };
}