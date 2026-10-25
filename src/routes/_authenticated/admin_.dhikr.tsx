import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin_/dhikr")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "إدارة قصص ذكرى | Darsna Jo" },
      { name: "description", content: "إضافة وتعديل قصص وموشحات صفحة ذكرى." },
      { property: "og:title", content: "إدارة قصص ذكرى | Darsna Jo" },
      { property: "og:description", content: "إضافة وتعديل قصص وموشحات صفحة ذكرى." },
    ],
  }),
  component: lazyRouteComponent(() => import("@/components/pages/admin-dhikr"), "AdminDhikr"),
});
