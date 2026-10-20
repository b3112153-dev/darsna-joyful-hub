import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-auth";
import { useMyFocus } from "@/hooks/use-focus";
import { deviceIds } from "@/lib/device";

/** Keeps the student's timer counting toward weekly stats on every page. */
export function FocusWatcher() {
  const { user } = useSession();
  useMyFocus(user?.id);
  return null;
}

/** Registers this device and kicks the user out the moment they get banned. */
export function BanGuard() {
  const { user } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const kicked = useRef(false);

  useEffect(() => {
    if (!user) return;
    kicked.current = false;
    const kick = async () => {
      if (kicked.current) return;
      kicked.current = true;
      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut();
      navigate({ to: "/banned", replace: true });
    };
    deviceIds().then((ids) => supabase.rpc("register_device", ids)).then((r) => {
      // register_device returns false when this device is banned
      if (r && r.data === false) kick();
    });
    const ch = supabase
      .channel(`ban-${user.id}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_bans", filter: `user_id=eq.${user.id}` }, kick)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, navigate, qc]);
  return null;
}
