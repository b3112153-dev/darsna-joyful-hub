import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { readData, requestSignal } from "@/lib/requests";
import { completionPatch, ENCOURAGEMENT, nextEncouragement, orderTodos, TODO_LIMIT, validTodoText, type Todo } from "@/lib/todos";

type Action = { kind: "add"; text: string; id: string } | { kind: "toggle"; id: string; done: boolean } | { kind: "delete"; id: string };
const lastEncouragement = new Map<string, number>();
export function useTodos(userId: string) {
  const qc = useQueryClient();
  const key = ["todos", userId];
  const busy = useRef(false);
  const query = useQuery({ queryKey: key, staleTime: 30_000, queryFn: async ({ signal }) =>
    await readData(supabase.from("todos").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(TODO_LIMIT).abortSignal(requestSignal(signal))) ?? [] });
  const mutation = useMutation({
    mutationFn: async (action: Action) => {
      if (action.kind === "add") {
        if (!validTodoText(action.text)) throw new Error("invalid task");
        await readData(supabase.from("todos").insert({ id: action.id, user_id: userId, text: action.text.trim() }).select("id"));
      } else if (action.kind === "toggle") {
        await readData(supabase.from("todos").update(completionPatch(action.done)).eq("id", action.id).eq("user_id", userId).select("id"));
      } else await readData(supabase.from("todos").delete().eq("id", action.id).eq("user_id", userId).select("id"));
    },
    onMutate: async (action) => {
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<Todo[]>(key);
      qc.setQueryData<Todo[]>(key, (rows = []) => {
        if (action.kind === "add") return [{ id: action.id, user_id: userId, text: action.text.trim(), done: false, done_at: null, created_at: new Date().toISOString() }, ...rows].slice(0, TODO_LIMIT);
        if (action.kind === "delete") return rows.filter((row) => row.id !== action.id);
        return rows.map((row) => row.id === action.id ? { ...row, ...completionPatch(action.done) } : row);
      });
      return { snapshot };
    },
    onError: (_error, _action, context) => { qc.setQueryData(key, context?.snapshot); toast.error("ما قدرنا نحفظ المهمة، جرّب مرة ثانية"); },
    onSuccess: (_data, action) => {
      if (action.kind === "toggle" && action.done) {
        const next = nextEncouragement(lastEncouragement.get(userId) ?? -1);
        lastEncouragement.set(userId, next);
        return;
      }
    },
    onSettled: async () => { await qc.invalidateQueries({ queryKey: key }); busy.current = false; },
  });
  async function act(action: Action) {
    if (busy.current) return false;
    busy.current = true;
    try { await mutation.mutateAsync(action); return true; } catch { return false; }
  }
  const encouragement = () => ENCOURAGEMENT[lastEncouragement.get(userId) ?? 0] ?? ENCOURAGEMENT[0];
  return { ...query, rows: orderTodos(query.data ?? []), pending: mutation.isPending, act, encouragement };
}