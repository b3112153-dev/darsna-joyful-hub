import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpLeft,
  BookOpen,
  Briefcase,
  Languages,
  LockKeyhole,
  Timer,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/study")({
  head: () => ({
    meta: [
      { title: "غرف التركيز | Darsna Jo" },
      {
        name: "description",
        content: "اختر مساحة تركيزك وابدأ جلسة دراسة بمؤقّت وملاحظات خاصة.",
      },
    ],
  }),
  component: StudySpaces,
});

type StudySpace = {
  branch: "business_languages" | "health_engineering";
  title: string;
  subtitle: string;
  description: string;
  icon: typeof Briefcase;
};

const spaces: StudySpace[] = [
  {
    branch: "business_languages",
    title: "الأعمال واللغات",
    subtitle: "مساحة مشتركة للمسارين",
    description:
      "ابدأ مؤقّتًا خاصًا فيك، دوّن ملاحظاتك، وارجع للدردشة بعد انتهاء الجلسة.",
    icon: Languages,
  },
  {
    branch: "health_engineering",
    title: "الصحي والهندسي",
    subtitle: "مساحة مشتركة للمسارين",
    description:
      "ركّز على دراستك بدون مقاطعات؛ الدردشة تظل مغلقة حتى يخلص مؤقّتك.",
    icon: BookOpen,
  },
];

function StudySpaces() {
  const {
    data: rooms = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["focus-rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("id,name,description,branch")
        .in("branch", ["business_languages", "health_engineering"])
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <main className="mx-auto max-w-5xl space-y-7 px-4 py-8">
      <header className="max-w-2xl">
        <p className="mb-1 text-sm font-semibold text-primary">
          جلسات هادئة، خطوة بخطوة
        </p>
        <h1 className="text-3xl font-bold md:text-4xl">غرف التركيز</h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          اختَر مجموعتك. مؤقّتك وملاحظاتك خاصة فيك، والدردشة لا تُفتح إلا بعد
          انتهاء وقت الدراسة.
        </p>
      </header>

      {isLoading ? (
        <p className="rounded-2xl border bg-card p-6 text-center text-muted-foreground">
          جاري تحميل غرف التركيز…
        </p>
      ) : (
        <>
          {isError && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive"
            >
              تعذر تحميل غرف التركيز. جرّب تحديث الصفحة.
            </p>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            {spaces.map((space) => {
              const room = rooms.find(
                (candidate) => candidate.branch === space.branch,
              );
              const Icon = space.icon;
              const card = (
                <div
                  className={`flex h-full flex-col rounded-3xl border bg-card p-6 shadow-card transition ${room ? "hover:-translate-y-1 hover:border-primary/50 hover:shadow-soft" : "opacity-75"}`}
                >
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <span className="grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
                      <Icon className="size-7" />
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                      <LockKeyhole className="size-3.5" /> دردشة مقفلة أثناء
                      الدراسة
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-primary">
                    {space.subtitle}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">{space.title}</h2>
                  <p className="mt-3 flex-1 leading-7 text-muted-foreground">
                    {space.description}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Timer className="size-4 text-primary" /> مؤقّت وملاحظات
                      محفوظة تلقائيًا
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                      {room ? "افتح غرفة التركيز" : "الغرفة قيد التجهيز"}{" "}
                      {room && <ArrowUpLeft className="size-4" />}
                    </span>
                  </div>
                </div>
              );

              return room ? (
                <Link
                  key={space.branch}
                  to="/rooms/$roomId"
                  params={{ roomId: room.id }}
                  className="block"
                >
                  {card}
                </Link>
              ) : (
                <div key={space.branch} aria-disabled="true">
                  {card}
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
