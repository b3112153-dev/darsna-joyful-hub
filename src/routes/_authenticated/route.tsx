import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { BanGuard, FocusWatcher } from "@/components/AppGuards";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: banned } = await supabase.rpc("is_banned", { _user_id: data.user.id });
    if (banned) { await supabase.auth.signOut(); throw redirect({ to: "/banned" }); }
    return { userId: data.user.id };
  },
  component: () => (
    <div className="min-h-screen bg-sky pb-16 md:pb-0">
      <SiteHeader />
      <BanGuard />
      <FocusWatcher />
      <Outlet />
    </div>
  ),
});
