import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { readData } from "@/lib/requests";

export type CatalogItem = {
  id: string;
  category: string;
  name_ar: string;
  name_en: string;
  price: number;
  level_req: number;
  gender: string;
  sort: number;
  active: boolean;
};

/** key -> public image url. Keys are item ids, or `itXX:female` / `itXX:male` for the six base outfits. */
export function useAvatarImages(enabled = true) {
  return useQuery({
    queryKey: ["avatar-images"],
    enabled,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const rows = (await readData(supabase.from("avatar_images").select("*"))) ?? [];
      const map: Record<string, string> = {};
      for (const r of rows) map[r.key] = r.url;
      return map;
    },
  });
}

export function useAvatarCatalog(enabled = true) {
  return useQuery({
    queryKey: ["avatar-catalog"],
    enabled,
    staleTime: 10 * 60_000,
    queryFn: async () => ((await readData(supabase.from("avatar_catalog").select("*").eq("active", true).order("sort"))) ?? []) as CatalogItem[],
  });
}

/** Resolve an item's image: gendered outfit keys first, then the plain item id. */
export function imageFor(images: Record<string, string>, itemId: string, category: string, gender?: string | null) {
  if (category === "outfit" && gender) {
    const gendered = images[`${itemId}:${gender}`];
    if (gendered) return gendered;
  }
  return images[itemId] ?? null;
}
