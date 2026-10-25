import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/SiteHeader";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "تعيين كلمة سر جديدة | Darsna Jo" },
      { name: "description", content: "اختر كلمة سر جديدة لحسابك في Darsna Jo." },
      { property: "og:title", content: "تعيين كلمة سر جديدة | Darsna Jo" },
      { property: "og:description", content: "اختر كلمة سر جديدة لحسابك في Darsna Jo." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const navigate = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) { toast.error(t("8 أحرف على الأقل")); return; }
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { toast.error(error.message); return; }
    toast.success(t("تم تغيير كلمة السر"));
    navigate({ to: "/rooms" });
  }
  return (
    <div className="min-h-screen bg-sky">
      <SiteHeader />
      <form onSubmit={submit} className="mx-auto mt-12 max-w-md space-y-4 rounded-3xl border bg-card p-8 shadow-soft">
        <h1 className="text-xl font-bold">{t("كلمة سر جديدة")}</h1>
        <Input type="password" dir="ltr" value={pw} onChange={(e) => setPw(e.target.value)} />
        <Button className="w-full bg-brand">{t("حفظ")}</Button>
      </form>
    </div>
  );
}
