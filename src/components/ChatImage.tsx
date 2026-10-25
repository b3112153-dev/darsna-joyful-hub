import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { readData } from "@/lib/requests";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PageState } from "@/components/PageState";
import { t } from "@/lib/i18n";
export type ImageBucket = "chat-images" | "support-images";
export function ChatImage({ path, bucket, thumbnail = false }: { path: string; bucket: ImageBucket; thumbnail?: boolean }) {
  const [open, setOpen] = useState(false);
  const query = useQuery({ queryKey: ["chat-image", bucket, path], staleTime: 45 * 60_000, refetchInterval: 45 * 60_000, queryFn: async () => await readData(supabase.storage.from(bucket).createSignedUrl(path, 3600)) });
  if (thumbnail) return query.data ? <img src={query.data.signedUrl} alt={t("صورة")} className="size-10 shrink-0 rounded-md object-cover" /> : <span className="text-xs">{t("صورة")}</span>;
  return <><PageState loading={query.isPending} error={query.isError} retry={() => void query.refetch()} />{query.data && <Button type="button" variant="ghost" className="my-1 block h-auto max-w-full p-0" aria-label={t("تكبير الصورة")} onClick={() => setOpen(true)}><img src={query.data.signedUrl} alt={t("صورة")} loading="lazy" className="max-h-72 max-w-full rounded-xl object-contain" /></Button>}<Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90dvh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-3xl"><DialogTitle>{t("صورة")}</DialogTitle>{query.data && <img src={query.data.signedUrl} alt={t("صورة")} className="max-h-[75dvh] w-full object-contain" />}</DialogContent></Dialog></>;
}