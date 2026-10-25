import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { readData, withTimeout } from "@/lib/requests";
import { generatePlan, todayStr, type PlanAnswers, type PlanItemDraft, type QuizRow, type UnitRow } from "@/lib/plan";

export function useCurriculum() {
  return useQuery({
    queryKey: ["curriculum-units"],
    staleTime: 300_000,
    queryFn: async () =>
      (await readData(supabase.from("curriculum_units").select("*").order("subject").order("semester").order("unit_no"))) as UnitRow[],
  });
}

export function useStudyPlan(userId: string | undefined) {
  return useQuery({
    queryKey: ["study-plan", userId],
    enabled: !!userId,
    queryFn: async () => {
      const row = await readData(supabase.from("study_plans").select("*").eq("user_id", userId!).maybeSingle());
      return row ? (row.answers as unknown as PlanAnswers) : null;
    },
  });
}

export function usePlanItems(userId: string | undefined) {
  return useQuery({
    queryKey: ["plan-items", userId],
    enabled: !!userId,
    queryFn: async () =>
      await readData(
        supabase.from("plan_items").select("*").eq("user_id", userId!).gte("day", todayStr()).order("day").order("start_min"),
      ),
  });
}

export function useApprovedQuizzes() {
  return useQuery({
    queryKey: ["plan-quizzes"],
    staleTime: 300_000,
    queryFn: async () =>
      (await readData(
        supabase.from("quizzes").select("id,subject,generation,status").eq("status", "approved").is("deleted_at", null),
      )) as QuizRow[],
  });
}

export function usePlanMutations(userId: string | undefined, generation: string | null) {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["plan-items", userId] });
    void qc.invalidateQueries({ queryKey: ["study-plan", userId] });
  };

  const saveAnswers = useMutation({
    mutationFn: async (answers: PlanAnswers) => {
      await readData(
        supabase.from("study_plans").upsert({ user_id: userId!, answers: answers as never, updated_at: new Date().toISOString() }),
      );
    },
    onSuccess: invalidate,
  });

  const regenerate = useMutation({
    mutationFn: async ({ answers, units, quizzes }: { answers: PlanAnswers; units: UnitRow[]; quizzes: QuizRow[] }) => {
      const keep = (answers.manualIds ?? []).filter(Boolean);
      let del = supabase.from("plan_items").delete().eq("user_id", userId!).eq("done", false).gte("day", todayStr());
      if (keep.length) del = del.not("id", "in", `(${keep.join(",")})`);
      await readData(del);
      const drafts: PlanItemDraft[] = generatePlan(answers, units, quizzes, new Date(), generation);
      for (let i = 0; i < drafts.length; i += 200) {
        await readData(
          supabase.from("plan_items").insert(drafts.slice(i, i + 200).map((d) => ({ ...d, user_id: userId! }))),
        );
      }
    },
    onSuccess: invalidate,
  });

  const toggleDone = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      await readData(supabase.from("plan_items").update({ done }).eq("id", id));
    },
    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: ["plan-items", userId] });
      const prev = qc.getQueryData<import("@/integrations/supabase/types").Tables<"plan_items">[]>(["plan-items", userId]);
      qc.setQueryData(["plan-items", userId], prev?.map((it) => (it.id === id ? { ...it, done } : it)));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["plan-items", userId], ctx.prev); },
    onSettled: invalidate,
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; day?: string; start_min?: number; minutes?: number; title?: string; subject?: string }) => {
      await readData(supabase.from("plan_items").update(patch).eq("id", id));
    },
    onSuccess: invalidate,
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      await readData(supabase.from("plan_items").delete().eq("id", id));
    },
    onSuccess: invalidate,
  });

  const addItem = useMutation({
    mutationFn: async (draft: PlanItemDraft) => {
      const res = await supabase.from("plan_items").insert({ ...draft, user_id: userId! });
      if (res.error && draft.kind === "custom") {
        // لو نوع مخصص مرفوض بقاعدة البيانات، نحفظه كمراجعة
        await readData(supabase.from("plan_items").insert({ ...draft, kind: "review", user_id: userId! }));
        return;
      }
      if (res.error) throw res.error;
    },
    onSuccess: invalidate,
  });

  const markManual = useMutation({
    mutationFn: async ({ answers, id }: { answers: PlanAnswers; id: string }) => {
      const manualIds = [...new Set([...(answers.manualIds ?? []), id])];
      await readData(
        supabase.from("study_plans").upsert({ user_id: userId!, answers: { ...answers, manualIds } as never, updated_at: new Date().toISOString() }),
      );
    },
    onSuccess: invalidate,
  });

  return { saveAnswers, regenerate, toggleDone, updateItem, deleteItem, addItem, markManual };
}
