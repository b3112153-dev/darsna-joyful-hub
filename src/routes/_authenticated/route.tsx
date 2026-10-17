import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { userId: data.user.id };
  },
  component: () => (
    <div className="min-h-screen bg-sky pb-16 md:pb-0">
      <SiteHeader />
      <Outlet />
    </div>
  ),
});
