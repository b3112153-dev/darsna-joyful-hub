import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMe } from "@/hooks/use-auth";
import { canDeleteContent } from "@/lib/message-permissions";
import { supabase } from "@/integrations/supabase/client";
import { readData } from "@/lib/requests";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
type ContentTable = "library_files" | "quizzes" | "topics";
export function DeleteContent({ table, id }: { table: ContentTable; id: string }) {
  const { me, user } = useMe(); const qc = useQueryClient(); const [busy, setBusy] = useState(false);
  if (!canDeleteContent(me)) return null;
  async function remove() {
    if (!user || busy || !confirm(t("حذف هذا العنصر؟"))) return;
    setBusy(true);
    try {
      if (table === "quizzes") await readData(supabase.from(table).update({ deleted_at: new Date().toISOString(), deleted_by: user.id }).eq("id", id));
      else await readData(supabase.from(table).delete().eq("id", id));
      for (const key of ["library", "quizzes", "quiz-play", "topic", "topics", "chat-review", "admin-pending-quizzes"]) void qc.invalidateQueries({ queryKey: [key] });
    } catch (error) { toast.error(error && typeof error === "object" && "message" in error ? String(error.message) : t("تعذر الحذف")); }
    finally { setBusy(false); }
  }
  return <Button type="button" variant="ghost" size="icon" className="shrink-0 text-destructive" aria-label={t("حذف")} title={t("حذف")} disabled={busy} onClick={() => void remove()}><Trash2 className="size-4" /></Button>;
}