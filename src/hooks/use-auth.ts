import { useEffect, useState, type ReactNode } from "react";
import { createElement } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { SessionContext, useSharedSession } from "./session-context";

/** Single auth listener for the whole app; every useSession() reads from it. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ session: Session | null; loading: boolean; error: boolean }>({ session: null, loading: true, error: false });
  useEffect(() => {
    let alive = true;
    const { data } = supabase.auth.onAuthStateChange((_e, s) => alive && setState({ session: s, loading: false, error: false }));
    supabase.auth.getSession()
      .then(({ data }) => alive && setState({ session: data.session, loading: false, error: false }))
      .catch(() => alive && setState({ session: null, loading: false, error: true }));
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);
  return createElement(SessionContext.Provider, { value: state }, children);
}

export function useSession() {
  const { session, loading } = useSharedSession();
  return { session, user: session?.user ?? null, loading };
}

export function useMe() {
  const { user, loading } = useSession();
  const q = useQuery({
    queryKey: ["me", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!user) throw new Error("سجّل دخولك أولاً");
      const [p, r, b, o, m] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then((res) => { if (res.error) throw res.error; return res; }),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("user_bans").select("user_id").eq("user_id", user.id).maybeSingle(),
        supabase.rpc("is_owner", { _user_id: user.id }),
        supabase.from("user_mutes").select("muted_until").eq("user_id", user.id).maybeSingle(),
      ]);
      for (const result of [p, r, b, o, m]) { if (result.error) throw result.error; }
      const roles = (r.data ?? []).map((x) => x.role);
      const isAdmin = roles.includes("admin");
      const isStaff = isAdmin || roles.includes("moderator");
      const isSupport = roles.includes("support");
      const mutedUntil = m.data && new Date(m.data.muted_until).getTime() > Date.now() ? m.data.muted_until : null;
      return {
        profile: p.data,
        roles,
        isAdmin,
        isStaff,
        isOwner: !!o.data,
        isSupport,
        /** Support-only accounts see nothing but the support desk. */
        supportOnly: isSupport && !isStaff,
        isBanned: !!b.data,
        mutedUntil,
      };
    },
  });
  return { user, loading: loading || (!!user && q.isLoading), me: q.data, isError: q.isError, refetch: q.refetch };
}
