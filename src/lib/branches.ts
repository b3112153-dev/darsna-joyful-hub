import type { Database } from "@/integrations/supabase/types";

export type Branch = Database["public"]["Enums"]["study_branch"];

export const BRANCHES: { value: Branch; label: string }[] = [
  { value: "health", label: "الصحي" },
  { value: "languages", label: "اللغات" },
  { value: "business", label: "الأعمال" },
  { value: "engineering", label: "الهندسي" },
];

export const branchLabel = (b: string | null | undefined) =>
  BRANCHES.find((x) => x.value === b)?.label ?? "مشترك";
