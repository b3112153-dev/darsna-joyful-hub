import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
const IDENTITY_QUERIES = new Set(["me", "wallet", "messages", "support", "support-threads", "active", "rounds", "study-presence", "weekly-board", "admin-users", "admin-messages", "admin-archive", "library-uploaders", "comments", "motivation"]);
export function invalidateIdentity(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ predicate: (q) => IDENTITY_QUERIES.has(String(q.queryKey[0])) });
}

export function ProfileSync() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase.channel(`profile-identity-${crypto.randomUUID()}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => {
      void invalidateIdentity(qc);
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [qc]);
  return null;
}