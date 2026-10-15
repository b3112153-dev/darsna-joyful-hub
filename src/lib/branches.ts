import type { Database } from "@/integrations/supabase/types";

export type Branch = Database["public"]["Enums"]["study_branch"];

export const BRANCHES: { value: Branch; label: string }[] = [
  { value: "scientific", label: "العلمي" },
  { value: "literary", label: "الأدبي" },
  { value: "industrial", label: "الصناعي" },
  { value: "it", label: "تكنولوجيا المعلومات" },
  { value: "health", label: "الصحي" },
  { value: "agricultural", label: "الزراعي" },
  { value: "home_economics", label: "الاقتصاد المنزلي" },
  { value: "hospitality", label: "الفندقي والسياحي" },
];

export const branchLabel = (b: Branch | null | undefined) =>
  BRANCHES.find((x) => x.value === b)?.label ?? "عام";
