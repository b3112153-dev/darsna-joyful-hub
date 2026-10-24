import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("App error", error, info.componentStack); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main role="alert" dir="rtl" className="grid min-h-screen place-items-center bg-background px-4 text-foreground"><div className="text-center"><h1 className="text-xl font-bold">ما قدرنا نفتح الصفحة</h1><p className="my-4 text-muted-foreground">صار خطأ مؤقت، جرّب تعيد تحميل الصفحة.</p><Button onClick={() => window.location.reload()}>إعادة تحميل</Button></div></main>;
  }
}