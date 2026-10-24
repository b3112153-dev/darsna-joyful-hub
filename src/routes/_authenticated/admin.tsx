import { createFileRoute, lazyRouteComponent, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!data) throw redirect({ to: "/rooms" });
  },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "لوحة التحكم | Darsna Jo" },
      { name: "description", content: "إدارة الغرف والمستخدمين والرسائل." },
      { property: "og:title", content: "لوحة التحكم | Darsna Jo" },
      { property: "og:description", content: "إدارة الغرف والمستخدمين والرسائل." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: lazyRouteComponent(() => import("@/components/pages/admin"), "Admin"),
});
