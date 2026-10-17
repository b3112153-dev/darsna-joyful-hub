import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  GraduationCap,
  Heart,
  Library,
  LogOut,
  Menu,
  MessagesSquare,
  Shield,
  Timer,
  User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "./ThemeToggle";
import { UserAvatar } from "./UserAvatar";

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
    <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-brand text-primary-foreground shadow-soft">
            <GraduationCap className="size-5" />
          </span>
          <span className="font-display text-lg font-bold">
            Darsna <span className="text-brand">Jo</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <ThemeToggle />
          {user ? (
            <>
              <div className="hidden items-center gap-1 md:flex">
                <Button asChild variant="ghost" size="sm">
                  <Link to="/rooms">
                    <MessagesSquare /> الدردشة
                  </Link>
                </Button>
                <DropdownMenu dir="rtl">
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <BookOpen /> بنوك الأسئلة والملفات
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem asChild>
                      <Link to="/library">
                        <Library /> بنوك الأسئلة والملفات
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/topics">
                        <BookOpen /> مواضيع ونقاشات
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/motivation">
                    <Heart /> التحفيز
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/study">
                    <Timer /> غرف التركيز
                  </Link>
                </Button>
              </div>

              <DropdownMenu dir="rtl">
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    aria-label="فتح القائمة"
                  >
                    <Menu className="size-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuItem asChild>
                    <Link to="/rooms">
                      <MessagesSquare /> الدردشة
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/library">
                      <Library /> بنوك الأسئلة والملفات
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/topics">
                      <BookOpen /> مواضيع ونقاشات
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/motivation">
                      <Heart /> التحفيز
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/study">
                      <Timer /> غرف التركيز
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu dir="rtl">
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="rounded-full"
                    aria-label="قائمة الحساب"
                  >
                    <UserAvatar
                      path={me?.profile?.avatar_url}
                      name={me?.profile?.display_name}
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/profile">
                      <User /> ملفي الشخصي
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/progress">
                      <Timer /> تقدمي
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/support">
                      <Heart /> تواصل مع الإدارة
                    </Link>
                  </DropdownMenuItem>
                  {me?.isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin">
                        <Shield /> لوحة التحكم
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={signOut}
                    className="text-destructive"
                  >
                    <LogOut /> تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild size="sm" className="bg-brand shadow-soft">
              <Link to="/auth">تسجيل الدخول</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
