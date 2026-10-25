import { Link } from "@tanstack/react-router";
import { AlertCircle, LoaderCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export function PageState({ loading, error, retry }: { loading?: boolean; error?: boolean; retry?: () => void }) {
  if (!loading && !error) return null;
  return <div role={error ? "alert" : "status"} className="flex flex-col items-center gap-3 px-4 py-8 text-center">
    {error ? <AlertCircle className="size-7 text-destructive" /> : <LoaderCircle className="size-7 animate-spin text-primary" />}
    <p className="text-sm text-muted-foreground">{error ? t("ما قدرنا نحمّل البيانات. تأكد من اتصالك وجرب مرة ثانية.") : "لحظة، بنجهّز الصفحة…"}</p>
    {error && retry && <Button variant="outline" onClick={retry}><RotateCcw /> {t("إعادة المحاولة")}</Button>}
  </div>;
}

export function Unavailable({ kind = t("الصفحة") }: { kind?: string }) {
  return <div className="mx-auto max-w-lg px-4 py-16 text-center"><h1 className="text-2xl font-bold">{kind} غير موجودة</h1><p className="my-4 text-muted-foreground">{t("ممكن الرابط قديم أو المحتوى انحذف. باقي المنصة متاحة.")}</p><Button asChild><Link to="/rooms">{t("العودة للغرف")}</Link></Button></div>;
}

export function RouteError({ reset }: { reset: () => void }) {
  return <main className="min-h-64"><PageState error retry={reset} /><div className="text-center"><Button asChild variant="ghost"><Link to="/">{t("العودة للرئيسية")}</Link></Button></div></main>;
}