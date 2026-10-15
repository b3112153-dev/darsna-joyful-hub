import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | Darsna Jo" },
      { name: "description", content: "سجّل دخولك أو أنشئ حساباً جديداً في Darsna Jo." },
      { property: "og:title", content: "تسجيل الدخول | Darsna Jo" },
      { property: "og:description", content: "سجّل دخولك أو أنشئ حساباً جديداً في Darsna Jo." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/rooms", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "SIGNED_IN" && s) navigate({ to: "/rooms", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error("الإيميل أو كلمة السر غير صحيحة");
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { toast.error("كلمة السر لازم تكون 8 أحرف على الأقل"); return; }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: { display_name: name } },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم إنشاء الحساب! افحص إيميلك لتأكيد الحساب.");
  }

  async function forgot() {
    if (!email) { toast.error("اكتب إيميلك أولاً"); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("أرسلنا لك رابط إعادة تعيين كلمة السر");
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("تعذر تسجيل الدخول عبر Google");
  }

  return (
    <div className="min-h-screen bg-sky">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
          <h1 className="mb-1 text-center text-2xl font-bold">أهلاً فيك 👋</h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">ادخل وابدأ تدرس مع زملاءك</p>
          <Button variant="outline" className="mb-4 w-full bg-silver-sheen" onClick={google}>
            المتابعة باستخدام Google
          </Button>
          <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> أو <span className="h-px flex-1 bg-border" />
          </div>
          <Tabs defaultValue="in" dir="rtl">
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="in">تسجيل الدخول</TabsTrigger>
              <TabsTrigger value="up">حساب جديد</TabsTrigger>
            </TabsList>
            <TabsContent value="in">
              <form onSubmit={signIn} className="space-y-4">
                <Field label="الإيميل"><Input type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
                <Field label="كلمة السر"><Input type="password" dir="ltr" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
                <Button disabled={busy} className="w-full bg-brand">دخول</Button>
                <button type="button" onClick={forgot} className="w-full text-sm text-primary hover:underline">نسيت كلمة السر؟</button>
              </form>
            </TabsContent>
            <TabsContent value="up">
              <form onSubmit={signUp} className="space-y-4">
                <Field label="الاسم"><Input required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} /></Field>
                <Field label="الإيميل"><Input type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
                <Field label="كلمة السر"><Input type="password" dir="ltr" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
                <Button disabled={busy} className="w-full bg-brand">إنشاء حساب</Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
        <p className="mt-4 text-center text-sm"><Link to="/" className="text-muted-foreground hover:underline">العودة للرئيسية</Link></p>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
