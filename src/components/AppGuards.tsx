import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-auth";
import { useMyFocus } from "@/hooks/use-focus";
import { deviceIds } from "@/lib/device";
import { readData } from "@/lib/requests";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

/** Keeps the student's timer counting toward weekly stats on every page. */
export function FocusWatcher() {
  const { user } = useSession();
  useMyFocus(user?.id, true);
  return null;
}

/** Registers this device and kicks the user out the moment they get banned. */
export function BanGuard() {
  const { user } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const kicked = useRef(false);
  const registered = useRef<string | null>(null);

  useEffect(() => {
    if (!user) { registered.current = null; return; }
    let active = true;
    kicked.current = false;
    const kick = async () => {
      if (!active || kicked.current) return;
      kicked.current = true;
      qc.clear();
      try { await supabase.auth.signOut({ scope: "local" }); }
      finally { if (active) void navigate({ to: "/banned", replace: true }); }
    };
    if (registered.current !== user.id) {
      registered.current = user.id;
      void deviceIds().then(async (ids) => {
        if (!active) return;
        await readData(supabase.rpc("register_device", ids));
        if (!active) return;
        const banned = await readData(supabase.rpc("device_is_banned", ids));
        if (active && banned === true) await kick();
      }).catch(() => { if (active) { registered.current = null; toast.error(t("تعذر التحقق من الجهاز؛ أعد تحميل الصفحة.")); } });
    }
    const ch = supabase
      .channel(`ban-${user.id}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_bans", filter: `user_id=eq.${user.id}` }, () => { void kick(); })
      .subscribe();
    return () => { active = false; void supabase.removeChannel(ch); };
  }, [user?.id, navigate, qc]);
  return null;
}
