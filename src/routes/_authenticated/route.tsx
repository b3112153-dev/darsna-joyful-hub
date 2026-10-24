import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { BanGuard, FocusWatcher } from "@/components/AppGuards";
import { OnboardingGate } from "@/components/OnboardingGate";
import { PageState } from "@/components/PageState";
import { readData } from "@/lib/requests";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  pendingComponent: () => <PageState loading />,
  errorComponent: () => <PageState error retry={() => window.location.reload()} />,
  beforeLoad: async () => {
    const data = await readData(supabase.auth.getUser());
    if (!data.user) throw redirect({ to: "/auth" });
    const banned = await readData(supabase.rpc("is_banned", { _user_id: data.user.id }));
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
