import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { chatImagePath, validateChatImage } from "@/lib/chat-images";
import { readData } from "@/lib/requests";
import { t } from "@/lib/i18n";
import type { ImageBucket } from "@/components/ChatImage";
export function useImagePicker() {
  const [file, setFile] = useState<File | null>(null);
  const select = (next: File | null) => { if (next) { const error = validateChatImage(next); if (error) { toast.error(t(error)); return; } } setFile(next); };
  const upload = async (uid: string, bucket: ImageBucket) => {
    if (!file) return null;
    const path = chatImagePath(uid, crypto.randomUUID(), file.type);
    await readData(supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false }));
    return path;
  };
  const paste = (event: React.ClipboardEvent) => { const image = Array.from(event.clipboardData.files).find((f) => f.type.startsWith("image/")); if (image) { event.preventDefault(); select(image); } };
  return { file, select, upload, paste };
}
export function ImagePicker({ file, onChange, disabled = false }: { file: File | null; onChange: (file: File | null) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null); const [url, setUrl] = useState("");
  useEffect(() => { if (!file) { setUrl(""); return; } const next = URL.createObjectURL(file); setUrl(next); return () => URL.revokeObjectURL(next); }, [file]);
  return <div className="flex shrink-0 items-center gap-1"><input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" disabled={disabled} onChange={(e) => { onChange(e.target.files?.[0] ?? null); e.target.value = ""; }} /><Button type="button" variant="outline" size="icon" disabled={disabled} aria-label={t("إرفاق صورة")} title={t("إرفاق صورة")} className="size-11" onClick={() => input.current?.click()}><ImagePlus /></Button>{file && <div className="relative"><img src={url} alt={t("معاينة الصورة")} className="size-12 rounded-md object-cover" /><Button type="button" variant="secondary" size="icon" className="absolute -end-1 -top-2 size-6" aria-label={t("إلغاء الصورة")} disabled={disabled} onClick={() => onChange(null)}><X className="size-3" /></Button></div>}</div>;
}