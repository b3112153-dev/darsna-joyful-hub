import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/topics/$topicId")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "نقاش | Darsna Jo" },
      { name: "description", content: "نقاش موضوع دراسي مع طلاب التوجيهي." },
      { property: "og:title", content: "نقاش | Darsna Jo" },
      { property: "og:description", content: "نقاش موضوع دراسي مع طلاب التوجيهي." },
    ],
  }),
  component: lazyRouteComponent(() => import("@/components/pages/topics.$topicId"), "TopicPage"),
});
