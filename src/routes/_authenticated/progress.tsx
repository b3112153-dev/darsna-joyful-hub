import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "تقدمي | Darsna Jo" },
      { name: "description", content: "ساعات الدراسة والتقدم حسب المادة والملخص الأسبوعي." },
      { property: "og:title", content: "تقدمي | Darsna Jo" },
      { property: "og:description", content: "ساعات الدراسة والتقدم حسب المادة والملخص الأسبوعي." },
    ],
  }),
  component: lazyRouteComponent(() => import("@/components/pages/progress"), "Progress"),
});
