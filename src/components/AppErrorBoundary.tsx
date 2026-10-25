import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch(error: Error, info: ErrorInfo) { console.error("App error", error, info.componentStack); }
  override render() {
    if (!this.state.failed) return this.props.children;
    return <main role="alert" dir="rtl" className="grid min-h-screen place-items-center bg-background px-4 text-foreground"><div className="text-center"><h1 className="text-xl font-bold">{t("ما قدرنا نفتح الصفحة")}</h1><p className="my-4 text-muted-foreground">{t("صار خطأ مؤقت، جرّب تعيد تحميل الصفحة.")}</p><Button onClick={() => window.location.reload()}>{t("إعادة تحميل")}</Button></div></main>;
  }
}