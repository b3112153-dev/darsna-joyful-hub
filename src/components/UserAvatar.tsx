import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function UserAvatar({
  path,
  name,
  className,
}: {
  path?: string | null;
  name?: string | null;
  className?: string;
}) {
  const isUrl = !!path && /^https?:\/\//.test(path);
  const { data: url } = useQuery({
    queryKey: ["avatar", path],
    enabled: !!path && !isUrl,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.storage.from("avatars").createSignedUrl(path!, 3600);
      return data?.signedUrl ?? null;
    },
  });
  const src = isUrl ? path! : url ?? undefined;
  return (
    <Avatar className={cn("border border-silver", className)}>
      {src && <AvatarImage src={src} alt={name ?? ""} />}
      <AvatarFallback className="bg-secondary text-secondary-foreground font-semibold">
        {(name ?? "؟").trim().charAt(0)}
      </AvatarFallback>
    </Avatar>
  );
}
