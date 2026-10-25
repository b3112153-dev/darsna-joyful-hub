import { t } from "@/lib/i18n";
export function MessageRole({ role, admin = false }: { role?: string | null; admin?: boolean }) {
  const label = admin || role === "admin" ? "الإدارة" : role === "moderator" ? "مشرف" : role === "support" ? "دعم" : null;
  if (!label) return null;
  return <span className="inline-flex shrink-0 items-center gap-1 text-xs">{role === "moderator" && !admin && <span aria-hidden="true" className="text-moderator-star">★</span>}<span className="rounded-full bg-role-badge px-2 py-0.5 font-semibold text-role-badge-foreground">{t(label)}</span></span>;
}