import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function ProfileSync() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase.channel(`profile-identity-${crypto.randomUUID()}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => {
      void qc.invalidateQueries({ predicate: (q) => !["avatar-images", "avatar-catalog"].includes(String(q.queryKey[0])) });
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [qc]);
  return null;
}