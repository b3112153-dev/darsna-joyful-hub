import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { BanGuard, FocusWatcher } from "@/components/AppGuards";
import { OnboardingGate } from "@/components/OnboardingGate";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: banned } = await supabase.rpc("is_banned", { _user_id: data.user.id });
    if (banned) { await supabase.auth.signOut(); throw redirect({ to: "/banned" }); }
    return { userId: data.user.id };
  },
  component: Layout,
});

function Layout() {
  const { pathname } = useLocation();
  const bare = pathname.startsWith("/onboarding");
  return (
    <div className="min-h-screen bg-sky pb-16 md:pb-0">
      {!bare && <SiteHeader />}
      <BanGuard />
      <FocusWatcher />
      <OnboardingGate>
        <Outlet />
      </OnboardingGate>
    </div>
  );
}
