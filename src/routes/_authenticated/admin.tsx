import { createFileRoute, lazyRouteComponent, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", context.userId);
    const roles = (data ?? []).map((r) => r.role);
    if (!roles.some((r) => r === "admin" || r === "moderator" || r === "support")) throw redirect({ to: "/rooms" });
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
