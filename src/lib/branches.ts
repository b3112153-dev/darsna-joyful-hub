import type { Database } from "@/integrations/supabase/types";

export type Branch = Database["public"]["Enums"]["study_branch"];

export const BRANCHES: { value: Branch; label: string }[] = [
  { value: "health_engineering", label: "الصحي والهندسي" },
  { value: "business_languages", label: "الأعمال واللغات" },
];

export const branchLabel = (b: string | null | undefined) =>
  BRANCHES.find((x) => x.value === b)?.label ?? "مشترك";
