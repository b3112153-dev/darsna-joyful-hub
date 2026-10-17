import type { Database } from "@/integrations/supabase/types";

export type Branch = Database["public"]["Enums"]["study_branch"];

/** Branches a student can pick in their profile. */
export const BRANCHES: { value: Branch; label: string }[] = [
  { value: "languages", label: "اللغات" },
  { value: "health_engineering", label: "الصحي والهندسي" },
  { value: "business", label: "الأعمال" },
];

const LABELS: Partial<Record<Branch, string>> = {
  languages: "اللغات",
  business: "الأعمال",
  health_engineering: "الصحي والهندسي",
  business_languages: "الأعمال واللغات",
  health: "الصحي",
  engineering: "الهندسي",
};

export const branchLabel = (b: string | null | undefined) => (b && LABELS[b as Branch]) || "مشترك";
