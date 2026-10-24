import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "المكتبة | Darsna Jo" },
      { name: "description", content: "ملفات ومراجعات التوجيهي مصنفة حسب الفرع والمادة." },
      { property: "og:title", content: "المكتبة | Darsna Jo" },
      { property: "og:description", content: "ملفات ومراجعات التوجيهي مصنفة حسب الفرع والمادة." },
    ],
  }),
  component: lazyRouteComponent(() => import("@/components/pages/library"), "Library"),
});
