import type { AvatarState } from "@/hooks/use-wallet";

/** Pure avatar-state → drawn-layers mapping. Kept UI-free so a future 3D renderer can reuse it. */
export type FigureLayers = {
  skin: string;
  hair: { style: "short" | "spiky" | "long" | "bun"; color: string };
  outfit: { top: string; bottom: string; crown: boolean };
  /** Jacket/clothes overlay color (it09-it17), null when none worn. */
  clothes: string | null;
  /** Long robe color for traditional wear it28-it30, null when none worn. */
  traditional: string | null;
  shoes: string;
  cap: string | null;
  glasses: string | null;
  watch: string | null;
  pendant: string | null;
  pet: { color: string; kind: "cat" | "dog" | "bunny" | "bird" } | null;
  effect: { color: string; kind: "sparkle" | "stars" | "hearts" | "flowers" | "glow" } | null;
};

export const SKIN = "#f0c8a0";
const BROWN = "#5b3a24";

const OUTFITS: Record<string, { top: string; bottom: string; crown?: boolean }> = {
  it00: { top: "#e8d5b5", bottom: "#8c0610" }, // أساسي بيج/عنابي
  it01: { top: "#3a7d44", bottom: "#dfe7df" }, // رياضي
  it02: { top: "#00c9b1", bottom: "#16302b" }, // نيون
  it03: { top: "#2b2b33", bottom: "#141419" }, // داكن
  it04: { top: "#e8762d", bottom: "#7a3b12" }, // برتقالي
  it05: { top: "#a8d8ea", bottom: "#3d6f8e" }, // جليدي أزرق
  it06: { top: "#5b3a8e", bottom: "#241640" }, // فلكي بنفسجي
  it07: { top: "#d4a017", bottom: "#7a5c00" }, // ذهبي
  it08: { top: "#6b1030", bottom: "#d4a017", crown: true }, // ملكي بتاج
};

const HAIR_STYLES: Record<string, FigureLayers["hair"]["style"]> = {
  it18: "spiky",
  it19: "long",
  it20: "bun",
};

const CLOTHES_COLORS = ["#8c0610", "#1f3a5f", "#3a7d44", "#b1a56b", "#7a3b12", "#5b3a8e", "#0f766e", "#9d3b5c", "#334155"];

const TRADITIONAL: Record<string, string> = {
  it28: "#f5f0e6", // ثوب
  it29: "#3a2a33", // عباية
  it30: "#e6dcc3", // دشداشة
};

const SHOES: Record<string, string> = { it21: "#8c0610", it22: "#1f3a5f", it23: "#2b2b33" };
const GLASSES: Record<string, string> = { it25: "#1f3a5f", it34: "#d4a017", it35: "#111827", it36: "#7a3b12" };
const WATCHES: Record<string, string> = { it31: "#d4a017", it32: "#c0c7d1", it33: "#2b2b33" };

const PET_KINDS: Array<NonNullable<FigureLayers["pet"]>["kind"]> = ["cat", "dog", "bunny", "bird"];
const PET_COLORS = ["#c98a4b", "#8c6b4a", "#e8e0d4", "#a8d8ea", "#9d3b5c", "#3a7d44", "#5b3a8e", "#d4a017", "#e8762d", "#64748b"];

const EFFECT_KINDS: Array<NonNullable<FigureLayers["effect"]>["kind"]> = ["sparkle", "stars", "hearts", "flowers", "glow"];
const EFFECT_COLORS = ["#d4a017", "#a8d8ea", "#e88ba0", "#9fce8a", "#b1a56b"];

function num(id: string | undefined): number {
  const m = /^it(\d+)$/.exec(id ?? "");
  return m ? Number(m[1]) : -1;
}

/** Resolve every drawable layer from the worn avatar items. Defaults: basic outfit, gender hairstyle. */
export function avatarLayers(avatar: AvatarState | null | undefined, gender?: string | null): FigureLayers {
  const a = avatar ?? {};
  const female = gender === "female";
  const outfit = OUTFITS[a.outfit ?? ""] ?? OUTFITS.it00;
  const clothesN = num(a.clothes);
  const petN = num(a.pet);
  const effectN = num(a.effect);
  return {
    skin: SKIN,
    hair: {
      style: HAIR_STYLES[a.hair ?? ""] ?? (female ? "long" : "short"),
      color: (female && a.hairColor) || BROWN,
    },
    outfit: { top: outfit.top, bottom: outfit.bottom, crown: !!outfit.crown },
    clothes: clothesN >= 9 && clothesN <= 17 ? CLOTHES_COLORS[clothesN - 9] : null,
    traditional: TRADITIONAL[a.traditional ?? ""] ?? null,
    shoes: SHOES[a.shoes ?? ""] ?? "#5b4636",
    cap: a.accessory === "it24" ? "#8c0610" : null,
    glasses: GLASSES[a.glasses ?? ""] ?? (GLASSES[a.accessory ?? ""] ?? null),
    watch: WATCHES[a.watch ?? ""] ?? null,
    pendant: a.accessory === "it27" ? "#d4a017" : null,
    pet: petN >= 37 && petN <= 46 ? { color: PET_COLORS[petN - 37], kind: PET_KINDS[(petN - 37) % PET_KINDS.length] } : null,
    effect: effectN >= 47 && effectN <= 51 ? { color: EFFECT_COLORS[effectN - 47], kind: EFFECT_KINDS[(effectN - 47) % EFFECT_KINDS.length] } : null,
  };
}

/** Main display color of a single catalog item (used for wardrobe card icons). */
export function itemColor(itemId: string, category: string, gender?: string | null): string {
  const layers = avatarLayers({ [category]: itemId }, gender);
  switch (category) {
    case "outfit": return layers.outfit.top;
    case "hair": return layers.hair.color === BROWN ? "#8c5a30" : layers.hair.color;
    case "clothes": return layers.clothes ?? "#64748b";
    case "traditional": return layers.traditional ?? "#e6dcc3";
    case "shoes": return layers.shoes;
    case "glasses": return layers.glasses ?? "#1f3a5f";
    case "watch": return layers.watch ?? "#d4a017";
    case "pet": return layers.pet?.color ?? "#c98a4b";
    case "effect": return layers.effect?.color ?? "#d4a017";
    case "accessory": return itemId === "it27" ? "#d4a017" : "#8c0610";
    default: return "#b1a56b";
  }
}
