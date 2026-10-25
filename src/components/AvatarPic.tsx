import { memo } from "react";
import { useAvatarImages, imageFor } from "@/hooks/use-avatar";
import { AvatarPreview } from "@/components/AvatarPreview";
import { cn } from "@/lib/utils";
import { profileAvatar, type PublicProfile } from "@/lib/identity";

/** Shared cached art, no per-person requests. The profile comes from its parent's joined/batched query. */
export const AvatarPic = memo(function AvatarPic({ profile, className, images, animate = false }: {
  profile?: PublicProfile | null; className?: string; images?: Record<string, string>; animate?: boolean;
}) {
  const art = useAvatarImages(!images);
  const resolved = images ?? art.data ?? {};
  const avatar = profileAvatar(profile);
  const hasImage = Object.entries(avatar).some(([category, id]) => category !== "hairColor" && !!imageFor(resolved, id, category, profile?.gender));
  const initials = (profile?.nickname ?? "?").trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("");
  return <span className={cn("relative inline-grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-tint text-avatar-foreground", className)}>
    {hasImage ? <AvatarPreview avatar={avatar} images={resolved} gender={profile?.gender} animate={animate} className="absolute inset-0" /> : <span className="font-display text-sm font-bold">{initials || "?"}</span>}
  </span>;
});