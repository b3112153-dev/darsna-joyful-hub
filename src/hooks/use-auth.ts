import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, user: session?.user ?? null, loading };
}

export function useMe() {
  const { user, loading } = useSession();
  const q = useQuery({
    queryKey: ["me", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [p, r, b] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
        supabase.from("user_bans").select("user_id").eq("user_id", user!.id).maybeSingle(),
      ]);
      const roles = (r.data ?? []).map((x) => x.role);
      return {
        profile: p.data,
        roles,
        isAdmin: roles.includes("admin"),
        isStaff: roles.includes("admin") || roles.includes("moderator"),
        isBanned: !!b.data,
      };
    },
  });
  return { user, loading: loading || (!!user && q.isLoading), me: q.data };
}
