import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useMe } from "@/hooks/use-auth";
import { t } from "@/lib/i18n";

/** Forces students through /onboarding once; staff skip it. Network errors never redirect. */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const { me, loading, isError, refetch } = useMe();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const onOnboarding = pathname.startsWith("/onboarding");
  const needs = !!me && !me.isStaff && !me.isOwner && me.profile?.onboarded_v2 !== true && !!me.profile;

  useEffect(() => {
    if (needs && !onOnboarding) navigate({ to: "/onboarding", replace: true });
  }, [needs, onOnboarding, navigate]);

  if (loading) return <Center><p className="text-muted-foreground">{t("جاري التحميل…")}</p></Center>;
  if (isError || !me) {
    return (
      <Center>
        <p className="mb-4">{t("ما قدرنا نحمّل بياناتك، تأكد من النت.")}</p>
        <button onClick={() => refetch()} className="rounded-xl bg-primary px-5 py-2.5 text-primary-foreground">{t("إعادة المحاولة")}</button>
      </Center>
    );
  }
  if (needs && !onOnboarding) return <Center><p className="text-muted-foreground">{t("جاري التحويل…")}</p></Center>;
  return <>{children}</>;
}

function Center({ children }: { children: ReactNode }) {
  return <div className="grid min-h-[60vh] place-items-center px-4 text-center"><div>{children}</div></div>;
}
