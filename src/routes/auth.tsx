import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/SiteHeader";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { property: "og:url", content: "https://drsna-joful.com/auth" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "تسجيل الدخول | Darsna Jo" },
      { name: "description", content: "سجّل دخولك أو أنشئ حساباً جديداً في Darsna Jo." },
      { property: "og:title", content: "تسجيل الدخول | Darsna Jo" },
      { property: "og:description", content: "سجّل دخولك أو أنشئ حساباً جديداً في Darsna Jo." },
    ],
    links: [{ rel: "canonical", href: "https://drsna-joful.com/auth" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const { session } = useSession();
  useEffect(() => { if (session) void navigate({ to: "/rooms", replace: true }); }, [session, navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(t("الإيميل أو كلمة السر غير صحيحة"));
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { toast.error(t("كلمة السر لازم تكون 8 أحرف على الأقل")); return; }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: { display_name: name } },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("تم إنشاء الحساب! افحص إيميلك لتأكيد الحساب."));
  }

  async function forgot() {
    if (!email) { toast.error(t("اكتب إيميلك أولاً")); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(t("أرسلنا لك رابط إعادة تعيين كلمة السر"));
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(t("تعذر تسجيل الدخول عبر Google"));
  }

  return (
    <div className="min-h-screen bg-sky">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
          <h1 className="mb-1 text-center text-2xl font-bold">{t("أهلاً فيك 👋")}</h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">{t("ادخل وابدأ تدرس مع زملاءك")}</p>
          <Button variant="outline" className="mb-4 w-full bg-silver-sheen" onClick={google}>
            {t("المتابعة باستخدام Google")}
          </Button>
          <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> {t("أو")} <span className="h-px flex-1 bg-border" />
          </div>
          <Tabs defaultValue="in" dir="rtl">
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="in">{t("تسجيل الدخول")}</TabsTrigger>
              <TabsTrigger value="up">{t("حساب جديد")}</TabsTrigger>
            </TabsList>
            <TabsContent value="in">
              <form onSubmit={signIn} className="space-y-4">
                <Field label={t("الإيميل")}><Input name="email" autoComplete="username" type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
                <Field label={t("كلمة السر")}><Input name="password" autoComplete="current-password" type="password" dir="ltr" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
                <Button disabled={busy} className="w-full bg-brand">{t("دخول")}</Button>
                <button type="button" dir="auto" onClick={forgot} className="w-full text-sm text-primary hover:underline">{t("نسيت كلمة السر؟")}</button>
              </form>
            </TabsContent>
            <TabsContent value="up">
              <form onSubmit={signUp} className="space-y-4">
                <Field label={t("الاسم")}><Input required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} /></Field>
                <Field label={t("الإيميل")}><Input name="email" autoComplete="username" type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
                <Field label={t("كلمة السر")}><Input name="password" autoComplete="new-password" type="password" dir="ltr" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
                <Button disabled={busy} className="w-full bg-brand">{t("إنشاء حساب")}</Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
        <p className="mt-4 text-center text-sm"><Link to="/" className="text-muted-foreground hover:underline">{t("العودة للرئيسية")}</Link></p>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
