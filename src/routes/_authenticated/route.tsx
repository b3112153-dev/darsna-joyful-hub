import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { BanGuard, FocusWatcher } from "@/components/AppGuards";
import { OnboardingGate } from "@/components/OnboardingGate";
import { PageState } from "@/components/PageState";
import { readData, withTimeout } from "@/lib/requests";
import { FocusModeProvider, FocusModeScreen, useFocusMode } from "@/components/FocusMode";
import { FocusExtras } from "@/components/FocusExtras";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  pendingComponent: () => <PageState loading />,
  errorComponent: () => <PageState error retry={() => window.location.reload()} />,
  beforeLoad: async () => {
    const { data, error } = await withTimeout(supabase.auth.getUser());
    if (error?.name === "AuthSessionMissingError") throw redirect({ to: "/auth" });
    if (error) throw error;
    if (!data.user) throw redirect({ to: "/auth" });
    const banned = await readData(supabase.rpc("is_banned", { _user_id: data.user.id }));
    if (banned) { await supabase.auth.signOut(); throw redirect({ to: "/banned" }); }
    return { userId: data.user.id };
  },
  component: Layout,
});

function Layout() {
  return <><BanGuard /><FocusWatcher /><OnboardingGate><FocusModeProvider><LayoutContent /><FocusExtras /></FocusModeProvider></OnboardingGate></>;
}

function LayoutContent() {
  const { pathname } = useLocation();
  const { visible } = useFocusMode();
  const bare = pathname.startsWith("/onboarding");
  if (visible && !bare) return <FocusModeScreen />;
  return (
    <div className="min-h-screen bg-sky pb-16 lg:pb-0">
      {!bare && <SiteHeader />}
      <Outlet />
    </div>
  );
}
