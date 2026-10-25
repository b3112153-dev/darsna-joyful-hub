import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3, BookOpen, CalendarCheck, GraduationCap, Headset, LogOut, MessagesSquare, Newspaper, Shield, Sparkles, Timer, User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "./UserAvatar";
import { ThemeToggle } from "./ThemeToggle";

export const MAIN_NAV = [
  { to: "/focus", label: "الرئيسية", icon: Timer },
  { to: "/plan", label: "حلّها", icon: CalendarCheck },
  { to: "/rooms", label: "الدردشات", icon: MessagesSquare },
  { to: "/library", label: "المكتبة", icon: BookOpen },
  { to: "/motivation", label: "ذكرى", icon: Sparkles },
  { to: "/profile", label: "ملفي", icon: User },
] as const;

export function SiteHeader() {
  const { user, me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-card/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-brand text-primary-foreground shadow-soft">
              <GraduationCap className="size-5" />
            </span>
            <span className="font-display text-lg font-bold">
              Darsna <span className="text-brand">Jo</span>
            </span>
          </Link>
          {user && (
            <nav className="hidden items-center gap-1 lg:flex">
              {MAIN_NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                  activeProps={{ className: "bg-secondary text-primary font-semibold" }}
                >
                  <n.icon className="size-4" /> {n.label}
                </Link>
              ))}
            </nav>
          )}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {user ? (
              <>
                {!me?.isAdmin && (
                  <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
                    <Link to="/support"><Headset /> تواصل مع الإدارة</Link>
                  </Button>
                )}
                <DropdownMenu dir="rtl">
                  <DropdownMenuTrigger className="rounded-full">
                    <UserAvatar path={me?.profile?.avatar_url} name={me?.profile?.display_name} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem asChild><Link to="/progress"><BarChart3 /> تقدمي</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/topics"><Newspaper /> مواضيع ونقاشات</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/profile"><User /> ملفي الشخصي</Link></DropdownMenuItem>
                    {!me?.isAdmin && (
                      <DropdownMenuItem asChild><Link to="/support"><Headset /> تواصل مع الإدارة</Link></DropdownMenuItem>
                    )}
                    {me?.isAdmin && (
                      <DropdownMenuItem asChild><Link to="/admin"><Shield /> لوحة التحكم</Link></DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="text-destructive"><LogOut /> تسجيل الخروج</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button asChild size="sm" className="bg-brand shadow-soft">
                <Link to="/auth">تسجيل الدخول</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      {user && (
        <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(72px+env(safe-area-inset-bottom))] grid-cols-6 border-t bg-card pb-[env(safe-area-inset-bottom)] font-display lg:hidden">
          {MAIN_NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="group flex min-w-0 flex-col items-center justify-center gap-1 text-xs font-semibold text-muted-foreground"
              activeProps={{ className: "text-foreground font-extrabold" }}
            >
              <span className="grid h-[30px] w-[52px] place-items-center rounded-full group-data-[status=active]:bg-secondary"><n.icon className="size-5" /></span><span>{n.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
