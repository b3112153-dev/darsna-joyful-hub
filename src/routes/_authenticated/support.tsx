import { createFileRoute } from "@tanstack/react-router";
import { useMe } from "@/hooks/use-auth";
import { SupportThread } from "@/components/SupportThread";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "تواصل مع الإدارة | Darsna Jo" },
      { name: "description", content: "محادثة خاصة بينك وبين إدارة Darsna Jo." },
      { property: "og:title", content: "تواصل مع الإدارة | Darsna Jo" },
      { property: "og:description", content: "محادثة خاصة بينك وبين إدارة Darsna Jo." },
    ],
  }),
  component: Support,
});

function Support() {
  const { user } = useMe();
  return (
    <main className="mx-auto flex h-[calc(100dvh-4rem)] max-w-3xl flex-col px-2 py-3 sm:px-4">
      <div className="mb-3 rounded-2xl border bg-card px-4 py-3 shadow-card">
        <h1 className="font-semibold">تواصل مع الإدارة</h1>
        <p className="text-xs text-muted-foreground">محادثة خاصة — بس إنت والإدارة بتشوفوها.</p>
      </div>
      {user && <SupportThread studentId={user.id} className="flex-1 min-h-0" />}
    </main>
  );
}
