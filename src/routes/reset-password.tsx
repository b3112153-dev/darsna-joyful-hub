import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
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
    if (pw.length < 8) return toast.error("8 أحرف على الأقل");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    toast.success("تم تغيير كلمة السر");
    navigate({ to: "/rooms" });
  }
  return (
    <div className="min-h-screen bg-sky">
      <SiteHeader />
      <form onSubmit={submit} className="mx-auto mt-12 max-w-md space-y-4 rounded-3xl border bg-card p-8 shadow-soft">
        <h1 className="text-xl font-bold">كلمة سر جديدة</h1>
        <Input type="password" dir="ltr" value={pw} onChange={(e) => setPw(e.target.value)} />
        <Button className="w-full bg-brand">حفظ</Button>
      </form>
    </div>
  );
}
