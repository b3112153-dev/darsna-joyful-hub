import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, ImagePlus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/motivation")({
  head: () => ({
    meta: [
      { title: "مساحة التحفيز | Darsna Jo" },
      {
        name: "description",
        content: "شارك صورة أو ذكرى تشجّع زملاءك على مواصلة الدراسة.",
      },
    ],
  }),
  component: Motivation,
});

type Post = {
  id: string;
  user_id: string;
  caption: string;
  image_path: string | null;
  created_at: string;
  profiles: { display_name: string; avatar_url: string | null } | null;
  imageUrl: string | null;
};

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MOTIVATION_POSTS_KEY = ["motivation-posts"] as const;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

function Motivation() {
  const { user, me } = useMe();
  const qc = useQueryClient();
  const [caption, setCaption] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const {
    data: posts = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: MOTIVATION_POSTS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("motivation_posts")
        .select(
          "id,user_id,caption,image_path,created_at,profiles(display_name,avatar_url)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;

      return Promise.all(
        ((data ?? []) as unknown as Omit<Post, "imageUrl">[]).map(
          async (post) => {
            if (!post.image_path) return { ...post, imageUrl: null };
            const { data: signed, error: signedError } = await supabase.storage
              .from("motivation")
              .createSignedUrl(post.image_path, 86400);
            return {
              ...post,
              imageUrl: signedError ? null : (signed?.signedUrl ?? null),
            };
          },
        ),
      );
    },
  });

  useEffect(() => {
    if (!image) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  useEffect(() => {
    const channel = supabase
      .channel("motivation-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "motivation_posts" },
        () => {
          qc.invalidateQueries({ queryKey: MOTIVATION_POSTS_KEY });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  function chooseImage(file: File | null) {
    if (!file) {
      setImage(null);
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImage(null);
      if (imageInput.current) imageInput.current.value = "";
      toast.error("اختَر صورة بصيغة JPG أو PNG أو WEBP أو GIF");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImage(null);
      if (imageInput.current) imageInput.current.value = "";
      toast.error("حجم الصورة لازم يكون أقل من 10 ميغابايت");
      return;
    }
    setImage(file);
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!user || me?.isBanned || !caption.trim() || busy) return;
    setBusy(true);

    let imagePath: string | null = null;
    if (image) {
      const extension = image.type.split("/")[1]!.replace("jpeg", "jpg");
      imagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("motivation")
        .upload(imagePath, image, { contentType: image.type, upsert: false });
      if (uploadError) {
        setBusy(false);
        toast.error("تعذر رفع الصورة");
        return;
      }
    }

    const { error } = await supabase.from("motivation_posts").insert({
      user_id: user.id,
      caption: caption.trim(),
      image_path: imagePath,
    });
    if (error) {
      if (imagePath)
        await supabase.storage.from("motivation").remove([imagePath]);
      setBusy(false);
      toast.error("تعذر نشر الذكرى");
      return;
    }

    setCaption("");
    setImage(null);
    if (imageInput.current) imageInput.current.value = "";
    setBusy(false);
    toast.success("تمت مشاركة لحظتك");
    qc.invalidateQueries({ queryKey: MOTIVATION_POSTS_KEY });
  }

  async function remove(post: Post) {
    if (!confirm("حذف هذه الذكرى؟")) return;
    const { error } = await supabase
      .from("motivation_posts")
      .delete()
      .eq("id", post.id);
    if (error) {
      toast.error("تعذر حذف المنشور");
      return;
    }
    if (post.image_path) {
      const { error: imageError } = await supabase.storage
        .from("motivation")
        .remove([post.image_path]);
      if (imageError) toast.error("تم حذف المنشور لكن تعذّر حذف الصورة");
    }
    qc.invalidateQueries({ queryKey: MOTIVATION_POSTS_KEY });
  }

  return (
    <main className="mx-auto max-w-3xl space-y-7 px-4 py-8">
      <header className="rounded-3xl border bg-card p-6 shadow-card md:p-8">
        <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
          <Heart className="size-6" />
        </span>
        <p className="mb-1 text-sm font-semibold text-primary">
          كل إنجاز بيستاهل ينحكى
        </p>
        <h1 className="text-3xl font-bold">مساحة التحفيز</h1>
        <p className="mt-2 max-w-xl leading-7 text-muted-foreground">
          شارك صورة أو ذكرى أو خطوة صغيرة أنجزتها. يمكن حكايتك تكون الدفعة اللي
          يحتاجها طالب ثاني اليوم.
        </p>
      </header>

      <form
        onSubmit={publish}
        className="space-y-4 rounded-2xl border bg-card p-5 shadow-card"
      >
        <label htmlFor="memory-caption" className="block font-semibold">
          شو حاب تشارك؟
        </label>
        <Textarea
          id="memory-caption"
          required
          minLength={1}
          maxLength={500}
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="اكتب ذكرى، إنجاز، أو كلمة تشجيع…"
          className="min-h-24"
          disabled={me?.isBanned || busy}
        />
        {preview && (
          <div className="overflow-hidden rounded-xl border">
            <img
              src={preview}
              alt="معاينة الصورة التي ستشاركها"
              className="max-h-72 w-full object-cover"
            />
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition hover:bg-accent">
            <ImagePlus className="size-4 text-primary" />
            {image ? image.name : "أضف صورة (اختياري)"}
            <input
              type="file"
              ref={imageInput}
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(event) => chooseImage(event.target.files?.[0] ?? null)}
              disabled={me?.isBanned || busy}
            />
          </label>
          <span className="text-xs text-muted-foreground">
            صور حتى 10 ميغابايت
          </span>
        </div>
        {me?.isBanned && (
          <p className="text-sm text-destructive">
            الحساب المحظور لا يمكنه إضافة منشورات.
          </p>
        )}
        <Button
          type="submit"
          disabled={busy || me?.isBanned || !caption.trim()}
          className="bg-brand"
        >
          <Send className="size-4" /> {busy ? "جاري النشر…" : "شارك مع الطلاب"}
        </Button>
      </form>

      <section aria-labelledby="motivation-feed-title" className="space-y-4">
        <div>
          <h2 id="motivation-feed-title" className="text-2xl font-bold">
            لحظات من مجتمعنا
          </h2>
          <p className="text-sm text-muted-foreground">
            المنشورات تظهر للطلاب المسجلين في المنصة.
          </p>
        </div>
        {isLoading && (
          <p className="text-muted-foreground">جاري تحميل المشاركات…</p>
        )}
        {isError && (
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive"
          >
            تعذر تحميل المشاركات. جرّب تحديث الصفحة.
          </p>
        )}
        {!isLoading && !isError && posts.length === 0 && (
          <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
            <Heart className="mx-auto mb-3 size-8 text-primary" />
            <p className="font-semibold">أول ذكرى بتبدأ منك</p>
            <p className="mt-1 text-sm text-muted-foreground">
              شارك لحظتك الأولى وخليها تشجّع غيرك.
            </p>
          </div>
        )}
        <div className="space-y-4">
          {posts.map((post) => {
            const name = post.profiles?.display_name ?? "طالب";
            const canDelete = post.user_id === user?.id || me?.isStaff;
            return (
              <article
                key={post.id}
                className="overflow-hidden rounded-2xl border bg-card shadow-card"
              >
                <div className="flex items-center gap-3 p-4">
                  <UserAvatar
                    path={post.profiles?.avatar_url}
                    name={name}
                    className="size-10"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{name}</p>
                    <time
                      dateTime={post.created_at}
                      className="text-xs text-muted-foreground"
                    >
                      {new Date(post.created_at).toLocaleString("ar-JO", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => remove(post)}
                      aria-label="حذف الذكرى"
                      className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
                {post.imageUrl && (
                  <img
                    src={post.imageUrl}
                    alt=""
                    loading="lazy"
                    className="max-h-[32rem] w-full bg-muted object-cover"
                  />
                )}
                <p className="whitespace-pre-wrap break-words px-4 py-4 leading-7">
                  {post.caption}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
