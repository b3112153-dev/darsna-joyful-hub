import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/admin_/curriculum")({
  head: () => ({ meta: [
    { title: "إدارة المنهاج | درسنا جو" },
    { name: "description", content: "إدارة وحدات المنهاج لجداول حلّها." },
    { property: "og:title", content: "إدارة المنهاج | درسنا جو" },
    { property: "og:description", content: "إدارة وحدات المنهاج." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: lazyRouteComponent(() => import("@/components/pages/admin-curriculum"), "AdminCurriculum"),
});
