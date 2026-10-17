import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3, BookOpen, GraduationCap, Headset, LogOut, MessagesSquare, Newspaper, Shield, Sparkles, Timer, User,
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
  { to: "/rooms", label: "الدردشة", icon: MessagesSquare },
  { to: "/library", label: "بنوك الأسئلة", icon: BookOpen },
  { to: "/motivation", label: "التحفيز", icon: Sparkles },
  { to: "/focus", label: "غرفة التركيز", icon: Timer },
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
            <nav className="hidden items-center gap-1 md:flex">
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
        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          {MAIN_NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground"
              activeProps={{ className: "text-primary font-semibold" }}
            >
              <n.icon className="size-5" /> {n.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
