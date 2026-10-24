import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/topics/")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "مواضيع ونقاشات | Darsna Jo" },
      { name: "description", content: "مواضيع دراسية تنشرها الإدارة ويناقشها الطلاب." },
      { property: "og:title", content: "مواضيع ونقاشات | Darsna Jo" },
      { property: "og:description", content: "مواضيع دراسية تنشرها الإدارة ويناقشها الطلاب." },
    ],
  }),
  component: lazyRouteComponent(() => import("@/components/pages/topics.index"), "Topics"),
});
