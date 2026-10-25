import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "التسجيل الأولي | Darsna Jo" },
      { name: "description", content: "أكمل بياناتك مرة وحدة لتبدأ مع درسنا جو." },
      { property: "og:title", content: "التسجيل الأولي | Darsna Jo" },
      { property: "og:description", content: "أكمل بياناتك مرة وحدة لتبدأ مع درسنا جو." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Onboarding,
});

const MONTHS = [t("كانون الثاني"), t("شباط"), t("آذار"), t("نيسان"), t("أيار"), t("حزيران"), t("تموز"), t("آب"), t("أيلول"), t("تشرين الأول"), t("تشرين الثاني"), t("كانون الأول")];
const YEARS = [2009, 2010];

export function isValidDate(y: number, m: number, d: number) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [gender, setGender] = useState<"female" | "male" | null>(null);
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateOk = !!day && !!month && !!year && isValidDate(+year, +month, +day);
  const ready = !!gender && dateOk && agree && !busy;

  async function submit() {
    if (!ready || !gender) return;
    setBusy(true);
    setError(null);
    const birth = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const { error: e } = await supabase.rpc("complete_onboarding", { _birth: birth, _gender: gender, _terms_version: "2026-10-24" });
    const msg = e?.message ?? "";
    if (!e || msg.includes("already onboarded")) {
      await qc.invalidateQueries({ queryKey: ["me"] });
      navigate({ to: "/rooms", replace: true });
      return;
    }
    setBusy(false);
    const text = msg.includes("unsupported birth year") ? t("الموقع حالياً لطلاب جيل ٢٠٠٩ و٢٠١٠ فقط") : "صار خطأ، جرّب مرة ثانية";
    setError(text);
    toast.error(text);
  }

  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const sel = "h-12 w-full rounded-xl border bg-background px-3 text-base";
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-3xl border bg-card p-6 shadow-soft">
        <h1 className="mb-2 text-center text-2xl font-bold">{t("أهلاً فيك في درسنا جو")}</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">{t("لازم نعرف جنسك وجيلك مرة وحدة بس، وما بتقدر تغيّرهم بعدين")}</p>

        <p className="mb-2 font-semibold">{t("الجنس")}</p>
        <div className="mb-6 grid grid-cols-2 gap-3">
          {([["female", t("بنت")], ["male", t("ولد")]] as const).map(([v, l]) => (
            <button key={v} type="button" onClick={() => setGender(v)} aria-pressed={gender === v}
              className={`h-16 rounded-2xl border-2 text-lg font-bold transition ${gender === v ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
              {l}
            </button>
          ))}
        </div>

        <p className="mb-2 font-semibold">{t("تاريخ الميلاد")}</p>
        <div className="mb-2 grid grid-cols-3 gap-2">
          <select aria-label={t("اليوم")} className={sel} value={day} onChange={(e) => setDay(e.target.value)}>
            <option value="">{t("اليوم")}</option>
            {Array.from({ length: 31 }, (_, i) => <option key={i} value={String(i + 1)}>{i + 1}</option>)}
          </select>
          <select aria-label={t("الشهر")} className={sel} value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">{t("الشهر")}</option>
            {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
          </select>
          <select aria-label={t("السنة")} className={sel} value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">{t("السنة")}</option>
            {YEARS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        </div>
        {day && month && year && !dateOk && <p className="mb-2 text-sm text-destructive">{t("هذا التاريخ مش صحيح")}</p>}

        <label className="mb-6 mt-4 flex items-start gap-3 text-sm" dir="ltr">
          <input type="checkbox" className="mt-1 size-5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>I have read and agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">Terms &amp; Privacy Policy</a></span>
        </label>

        {error && <p className="mb-3 text-center text-sm text-destructive">{error}</p>}
        <Button disabled={!ready} onClick={submit} className="h-12 w-full text-base">{busy ? t("لحظة…") : "تأكيد وبدء"}</Button>
        <button type="button" onClick={logout} className="mt-4 w-full text-sm text-muted-foreground hover:underline">{t("تسجيل الخروج")}</button>
      </div>
    </main>
  );
}
