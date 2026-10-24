import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/motivation")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "التحفيز | Darsna Jo" },
      { name: "description", content: "صور وذكريات وكلمات تحفيزية من طلاب التوجيهي." },
      { property: "og:title", content: "التحفيز | Darsna Jo" },
      { property: "og:description", content: "صور وذكريات وكلمات تحفيزية من طلاب التوجيهي." },
    ],
  }),
  component: lazyRouteComponent(() => import("@/components/pages/motivation"), "Motivation"),
});
