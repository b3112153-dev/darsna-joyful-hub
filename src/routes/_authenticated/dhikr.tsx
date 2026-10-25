import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dhikr")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "ذكرى | Darsna Jo" },
      { name: "description", content: "أذكارك اليومية وقصة اليوم في درسنا جو." },
      { property: "og:title", content: "ذكرى | Darsna Jo" },
      { property: "og:description", content: "أذكارك اليومية وقصة اليوم في درسنا جو." },
    ],
  }),
  component: lazyRouteComponent(() => import("@/components/pages/dhikr"), "Dhikr"),
});
