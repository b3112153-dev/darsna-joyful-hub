import { memo } from "react";
import { UserAvatar } from "@/components/UserAvatar";
import { avatarLayers } from "@/lib/avatar-figure";
import { profileAvatar, type PublicProfile } from "@/lib/identity";
import { cn } from "@/lib/utils";

/** Head-and-shoulders SVG avatar inside a cream circle. Pure SVG, no per-person image requests. */
export const AvatarPic = memo(function AvatarPic({ profile, className, animate = false }: {
  profile?: PublicProfile | null | undefined; className?: string; images?: Record<string, string>; animate?: boolean;
}) {
  const url = profile?.avatar_url;
  if (url) {
    return (
      <UserAvatar
        path={url}
        name={profile?.nickname ?? profile?.display_name}
        className={cn("size-10 shrink-0", className)}
      />
    );
  }
  const l = avatarLayers(profileAvatar(profile), profile?.gender);
  return (
    <span className={cn("relative inline-grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-avatar-foreground", className)}>
      <svg viewBox="24 6 72 72" className={cn("absolute inset-0 h-full w-full", animate && "avatar-breathe")} role="img" aria-label="الأفتار">
        {/* shoulders */}
        <path d="M38 78 Q60 62 82 78 L82 84 L38 84 Z" fill={l.traditional ?? l.clothes ?? l.outfit.top} />
        {/* neck */}
        <rect x="54" y="56" width="12" height="10" rx="4" fill={l.skin} />
        {/* head */}
        <circle cx="60" cy="42" r="20" fill={l.skin} />
        {/* hair */}
        {l.hair.style === "long" ? (
          <path d="M36 46 Q32 16 60 12 Q88 16 84 46 L84 70 Q79 74 76 68 L76 40 Q60 30 44 40 L44 68 Q41 74 36 70 Z" fill={l.hair.color} />
        ) : l.hair.style === "bun" ? (
          <g fill={l.hair.color}>
            <circle cx="60" cy="13" r="7" />
            <path d="M40 42 Q38 16 60 14 Q82 16 80 42 Q70 28 60 28 Q50 28 40 42 Z" />
          </g>
        ) : l.hair.style === "spiky" ? (
          <path d="M40 40 L44 22 L50 32 L56 16 L62 30 L68 15 L74 30 L80 22 L82 40 Q70 26 60 26 Q50 26 40 40 Z" fill={l.hair.color} />
        ) : (
          <path d="M40 42 Q38 16 60 14 Q82 16 80 42 L80 34 Q70 24 60 24 Q50 24 40 34 Z" fill={l.hair.color} />
        )}
        {/* face */}
        <circle cx="53" cy="42" r="2.2" fill="#2b1b12" />
        <circle cx="67" cy="42" r="2.2" fill="#2b1b12" />
        <path d="M54 50 Q60 55 66 50" stroke="#a3553a" strokeWidth="2" fill="none" strokeLinecap="round" />
        {l.glasses && (
          <g stroke={l.glasses} strokeWidth="2" fill="none">
            <circle cx="53" cy="42" r="5" />
            <circle cx="67" cy="42" r="5" />
            <path d="M58 42 L62 42" />
          </g>
        )}
        {l.cap && (
          <g fill={l.cap}>
            <path d="M40 36 Q40 18 60 18 Q80 18 80 36 Z" />
            <ellipse cx="60" cy="36" rx="24" ry="4" />
          </g>
        )}
        {l.outfit.crown && <path d="M48 22 L52 12 L58 19 L60 9 L62 19 L68 12 L72 22 Z" fill="#d4a017" />}
        {l.effect && <circle cx="60" cy="45" r="30" fill="none" stroke={l.effect.color} strokeWidth="2" opacity="0.5" />}
      </svg>
    </span>
  );
});
