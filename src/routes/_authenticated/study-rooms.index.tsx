import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/study-rooms/")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "رومات الدراسة | Darsna Jo" },
      { name: "description", content: "ادرس مع رفقاتك برومات تركيز جماعية." },
      { property: "og:title", content: "رومات الدراسة | Darsna Jo" },
      { property: "og:description", content: "ادرس مع رفقاتك برومات تركيز جماعية." },
    ],
  }),
  component: lazyRouteComponent(() => import("@/components/pages/study-rooms"), "StudyRooms"),
});
