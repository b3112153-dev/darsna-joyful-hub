import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatImage, type ImageBucket } from "@/components/ChatImage";
import { t } from "@/lib/i18n";
export type Quote = { content: string; image_path?: string | null };
export function ReplyQuote({ quote, bucket = "chat-images", onCancel }: { quote: Quote; bucket?: ImageBucket; onCancel?: () => void }) {
  return <div className="my-1 flex min-w-0 items-center gap-2 rounded-xl border-s-4 border-primary/60 bg-secondary/60 px-2 py-1.5 text-xs text-muted-foreground">{quote.image_path && <ChatImage path={quote.image_path} bucket={bucket} thumbnail />}<span className="min-w-0 flex-1 truncate">{t("رد على:")} {quote.content || t("صورة")}</span>{onCancel && <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" aria-label={t("إلغاء الرد")} onClick={onCancel}><X className="size-4" /></Button>}</div>;
}