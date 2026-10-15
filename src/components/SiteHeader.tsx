import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { GraduationCap, LogOut, MessagesSquare, Shield, User } from "lucide-react";
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
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/rooms">
                  <MessagesSquare /> الغرف
                </Link>
              </Button>
              {me?.isAdmin && (
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link to="/admin">
                    <Shield /> لوحة التحكم
                  </Link>
                </Button>
              )}
              <DropdownMenu dir="rtl">
                <DropdownMenuTrigger className="rounded-full">
                  <UserAvatar path={me?.profile?.avatar_url} name={me?.profile?.display_name} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/rooms"><MessagesSquare /> الغرف</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile"><User /> ملفي الشخصي</Link>
                  </DropdownMenuItem>
                  {me?.isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin"><Shield /> لوحة التحكم</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
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
