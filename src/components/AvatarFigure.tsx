import { memo } from "react";
import type { AvatarState } from "@/hooks/use-wallet";
import { avatarLayers, type FigureLayers } from "@/lib/avatar-figure";
import { cn } from "@/lib/utils";

function Hair({ hair, skin }: { hair: FigureLayers["hair"]; skin: string }) {
  if (hair.style === "long") {
    return (
      <g>
        <path d="M34 52 Q30 18 60 14 Q90 18 86 52 L86 78 Q80 84 76 78 L76 44 Q60 34 44 44 L44 78 Q40 84 34 78 Z" fill={hair.color} />
        <circle cx="60" cy="42" r="20" fill={skin} />
      </g>
    );
  }
  if (hair.style === "bun") {
    return (
      <g>
        <circle cx="60" cy="13" r="7" fill={hair.color} />
        <path d="M40 42 Q38 16 60 14 Q82 16 80 42 Q70 28 60 28 Q50 28 40 42 Z" fill={hair.color} />
        <circle cx="60" cy="42" r="20" fill={skin} />
      </g>
    );
  }
  if (hair.style === "spiky") {
    return (
      <g>
        <path d="M40 40 L44 22 L50 32 L56 16 L62 30 L68 15 L74 30 L80 22 L82 40 Q70 26 60 26 Q50 26 40 40 Z" fill={hair.color} />
        <circle cx="60" cy="42" r="20" fill={skin} />
      </g>
    );
  }
  return (
    <g>
      <path d="M40 42 Q38 16 60 14 Q82 16 80 42 L80 34 Q70 24 60 24 Q50 24 40 34 Z" fill={hair.color} />
      <circle cx="60" cy="42" r="20" fill={skin} />
    </g>
  );
}

function Face() {
  return (
    <g>
      <circle cx="53" cy="42" r="2.2" fill="#2b1b12" />
      <circle cx="67" cy="42" r="2.2" fill="#2b1b12" />
      <path d="M54 50 Q60 55 66 50" stroke="#a3553a" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Effect({ effect }: { effect: NonNullable<FigureLayers["effect"]> }) {
  const c = effect.color;
  if (effect.kind === "glow") return <circle cx="60" cy="80" r="56" fill={c} opacity="0.22" />;
  const shapes = [
    { x: 14, y: 26 }, { x: 106, y: 34 }, { x: 10, y: 96 }, { x: 110, y: 104 }, { x: 22, y: 140 }, { x: 98, y: 146 },
  ];
  return (
    <g fill={c} opacity="0.85">
      {shapes.map((s, i) =>
        effect.kind === "hearts" ? (
          <path key={i} d={`M${s.x} ${s.y} c-3-4-9-1-6 4 l6 6 6-6 c3-5-3-8-6-4z`} />
        ) : effect.kind === "flowers" ? (
          <g key={i}>
            {[0, 72, 144, 216, 288].map((r) => (
              <circle key={r} cx={s.x + 4 * Math.cos((r * Math.PI) / 180)} cy={s.y + 4 * Math.sin((r * Math.PI) / 180)} r="2.6" />
            ))}
            <circle cx={s.x} cy={s.y} r="2" fill="#fff7e0" />
          </g>
        ) : (
          <path key={i} d={`M${s.x} ${s.y - 6} L${s.x + 1.8} ${s.y - 1.8} L${s.x + 6} ${s.y} L${s.x + 1.8} ${s.y + 1.8} L${s.x} ${s.y + 6} L${s.x - 1.8} ${s.y + 1.8} L${s.x - 6} ${s.y} L${s.x - 1.8} ${s.y - 1.8} Z`} />
        ),
      )}
    </g>
  );
}

function Pet({ pet }: { pet: NonNullable<FigureLayers["pet"]> }) {
  const c = pet.color;
  return (
    <g>
      <ellipse cx="98" cy="140" rx="13" ry="11" fill={c} />
      <circle cx="98" cy="127" r="9" fill={c} />
      {pet.kind === "bunny" ? (
        <g fill={c}>
          <ellipse cx="93" cy="114" rx="3" ry="8" />
          <ellipse cx="103" cy="114" rx="3" ry="8" />
        </g>
      ) : pet.kind === "bird" ? (
        <path d="M98 118 L104 112 L106 120 Z" fill={c} />
      ) : (
        <g fill={c}>
          <path d="M91 120 L94 110 L98 119 Z" />
          <path d="M105 120 L102 110 L98 119 Z" />
        </g>
      )}
      <circle cx="95" cy="127" r="1.4" fill="#2b1b12" />
      <circle cx="101" cy="127" r="1.4" fill="#2b1b12" />
      {pet.kind === "dog" && <ellipse cx="98" cy="131" rx="3" ry="2.4" fill="#fff7e0" />}
    </g>
  );
}

/** Full stylized 2D character drawn purely in SVG — never an empty placeholder icon. */
export const AvatarFigure = memo(function AvatarFigure({
  avatar,
  gender,
  size = 200,
  className,
  animate = true,
}: {
  avatar: AvatarState | null | undefined;
  gender?: string | null;
  size?: number;
  className?: string;
  animate?: boolean;
}) {
  const l = avatarLayers(avatar, gender);
  return (
    <svg
      viewBox="0 0 120 160"
      width={size}
      height={(size * 160) / 120}
      role="img"
      aria-label="الأفتار"
      className={cn(animate && "avatar-breathe", className)}
    >
      {l.effect && <Effect effect={l.effect} />}
      {l.pet && <Pet pet={l.pet} />}
      {/* legs + shoes */}
      {l.traditional ? (
        <path d="M44 78 Q60 70 76 78 L82 146 Q60 152 38 146 Z" fill={l.traditional} />
      ) : (
        <g>
          <rect x="46" y="108" width="11" height="34" rx="5" fill={l.outfit.bottom} />
          <rect x="63" y="108" width="11" height="34" rx="5" fill={l.outfit.bottom} />
        </g>
      )}
      <ellipse cx="50" cy="146" rx="9" ry="5" fill={l.shoes} />
      <ellipse cx="70" cy="146" rx="9" ry="5" fill={l.shoes} />
      {/* neck + torso */}
      <rect x="54" y="54" width="12" height="12" rx="4" fill={l.skin} />
      <path d="M40 66 Q60 56 80 66 L78 112 Q60 118 42 112 Z" fill={l.traditional ?? l.outfit.top} />
      {/* arms */}
      <rect x="32" y="68" width="9" height="32" rx="4.5" fill={l.clothes ?? l.traditional ?? l.outfit.top} />
      <rect x="79" y="68" width="9" height="32" rx="4.5" fill={l.clothes ?? l.traditional ?? l.outfit.top} />
      {/* clothes jacket overlay */}
      {l.clothes && !l.traditional && (
        <g fill={l.clothes}>
          <path d="M40 70 Q50 65 56 64 L54 112 Q46 113 42 112 Z" />
          <path d="M80 70 Q70 65 64 64 L66 112 Q74 113 78 112 Z" />
        </g>
      )}
      {l.pendant && (
        <g>
          <path d="M52 68 Q60 80 68 68" stroke="#b1a56b" strokeWidth="1.6" fill="none" />
          <circle cx="60" cy="79" r="3.4" fill={l.pendant} />
        </g>
      )}
      {l.watch && (
        <g>
          <rect x="79" y="96" width="9" height="4" rx="2" fill={l.watch} />
          <circle cx="83.5" cy="98" r="3" fill={l.watch} stroke="#fff7e0" strokeWidth="1" />
        </g>
      )}
      {/* head */}
      <Hair hair={l.hair} skin={l.skin} />
      <Face />
      {l.glasses && (
        <g stroke={l.glasses} strokeWidth="2" fill="none">
          <circle cx="53" cy="42" r="5" />
          <circle cx="67" cy="42" r="5" />
          <path d="M58 42 L62 42" />
        </g>
      )}
      {l.cap && (
        <g>
          <path d="M40 36 Q40 18 60 18 Q80 18 80 36 Z" fill={l.cap} />
          <ellipse cx="60" cy="36" rx="24" ry="4" fill={l.cap} />
        </g>
      )}
      {l.outfit.crown && (
        <g fill="#d4a017">
          <path d="M48 22 L52 12 L58 19 L60 9 L62 19 L68 12 L72 22 Z" />
          <circle cx="60" cy="9" r="1.8" fill="#e88ba0" />
        </g>
      )}
    </svg>
  );
});
