import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/study-rooms/$roomId")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "روم دراسة | Darsna Jo" },
      { name: "description", content: "جلسة تركيز جماعية مع رفقاتك." },
      { property: "og:title", content: "روم دراسة | Darsna Jo" },
      { property: "og:description", content: "جلسة تركيز جماعية مع رفقاتك." },
    ],
  }),
  component: lazyRouteComponent(() => import("@/components/pages/study-room"), "StudyRoom"),
});
