import { User } from "lucide-react";
import { imageFor } from "@/hooks/use-avatar";
import type { AvatarState } from "@/hooks/use-wallet";
import { cn } from "@/lib/utils";

type Layer = { key: string; z: number; className: string };

const LAYERS: Layer[] = [
  { key: "effect", z: 0, className: "inset-0 opacity-90" },
  { key: "pet", z: 1, className: "bottom-0 left-0 top-auto h-2/5 w-2/5" },
  { key: "royal_pet", z: 1, className: "bottom-0 right-0 top-auto h-2/5 w-2/5" },
  { key: "outfit", z: 2, className: "inset-0" },
  { key: "clothes", z: 2, className: "inset-0" },
  { key: "traditional", z: 2, className: "inset-0" },
  { key: "shoes", z: 3, className: "inset-x-0 bottom-0 top-auto h-1/3" },
  { key: "hair", z: 4, className: "inset-x-0 top-0 h-1/2" },
  { key: "glasses", z: 5, className: "inset-x-0 top-0 h-1/2" },
  { key: "accessory", z: 6, className: "inset-0" },
  { key: "watch", z: 7, className: "inset-0" },
];

export function AvatarPreview({
  avatar,
  images,
  gender,
  nickname,
  className,
  animate = true,
}: {
  avatar: AvatarState | null | undefined;
  images: Record<string, string>;
  gender?: string | null;
  nickname?: string | null;
  className?: string;
  animate?: boolean;
}) {
  const state = avatar ?? {};
  const layers = LAYERS.map((l) => {
    const itemId = state[l.key];
    if (!itemId) return null;
    const url = imageFor(images, itemId, l.key, gender);
    if (!url) return null;
    const tint = l.key === "hair" && gender === "female" && state.hairColor ? state.hairColor : null;
    return { ...l, url, tint };
  }).filter((x): x is Layer & { url: string; tint: string | null } => !!x);

  return (
    <div className={cn("relative", className)}>
      {nickname && (
        <span className="absolute -top-3 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full border bg-card px-3 py-0.5 text-xs font-bold shadow-card">
          {nickname}
        </span>
      )}
      <div className={cn("relative h-full w-full", animate && "avatar-breathe")}>
        {layers.length === 0 && (
          <div className="grid h-full w-full place-items-center rounded-full bg-secondary">
            <User className="size-1/3 text-muted-foreground" />
          </div>
        )}
        {layers.map((l) =>
          l.tint ? (
            <div
              key={l.key}
              className={cn("absolute", l.className)}
              style={{
                zIndex: l.z,
                backgroundColor: l.tint,
                WebkitMaskImage: `url(${l.url})`,
                maskImage: `url(${l.url})`,
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
              }}
            />
          ) : (
            <img
              key={l.key}
              src={l.url}
              alt=""
              draggable={false}
              className={cn("absolute object-contain", l.className)}
              style={{ zIndex: l.z }}
            />
          ),
        )}
      </div>
    </div>
  );
}
