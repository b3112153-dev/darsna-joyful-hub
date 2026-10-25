import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy, MoreHorizontal, Pencil, Reply, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { REACTION_EMOJIS } from "@/lib/reactions";
import { t } from "@/lib/i18n";

type Actions = {
  onReact: (emoji: string) => void;
  onReply: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCopy: () => void;
};

export function MessageActionsBar({ actions, children }: { actions: Actions; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const pick = (fn: () => void) => () => { setOpen(false); fn(); };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          onTouchStart={() => {
            longPressed.current = false;
            timer.current = setTimeout(() => { longPressed.current = true; setOpen(true); }, 400);
          }}
          onTouchEnd={() => { if (timer.current) clearTimeout(timer.current); }}
          onTouchMove={() => { if (timer.current) clearTimeout(timer.current); }}
          onContextMenu={(event) => { event.preventDefault(); setOpen(true); }}
          onClickCapture={(event) => {
            if (longPressed.current) { event.preventDefault(); event.stopPropagation(); longPressed.current = false; }
          }}
          className="contents"
        >
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent dir="rtl" align="center" side="top" className="w-auto space-y-1 rounded-[20px] p-2">
        <div className="flex gap-1">
          {REACTION_EMOJIS.map((emoji) => (
            <button key={emoji} type="button" aria-label={`تفاعل ${emoji}`} onClick={pick(() => actions.onReact(emoji))}
              className="grid size-9 place-items-center rounded-full text-xl transition hover:bg-secondary active:scale-90">
              {emoji}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1 border-t pt-1.5">
          <Button size="sm" variant="ghost" className="justify-start" onClick={pick(actions.onReply)}><Reply /> {t("رد")}</Button>
          <CopyButton onCopy={pick(actions.onCopy)} />
          {actions.onEdit && <Button size="sm" variant="ghost" className="justify-start" onClick={pick(actions.onEdit)}><Pencil /> {t("تعديل")}</Button>}
          {actions.onDelete && <Button size="sm" variant="ghost" className="justify-start text-destructive" onClick={pick(actions.onDelete)}><Trash2 /> {t("حذف")}</Button>}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CopyButton({ onCopy }: { onCopy: () => void }) {
  return <Button size="sm" variant="ghost" className="justify-start" onClick={onCopy}><Copy /> {t("نسخ")}</Button>;
}

export function MoreButton({ onClick }: { onClick: () => void }) {
  return <Button variant="ghost" size="icon" aria-label={t("خيارات الرسالة")} onClick={onClick} className="size-8 shrink-0 text-muted-foreground"><MoreHorizontal className="size-4" /></Button>;
}

export async function copyMessage(content: string) {
  try {
    await navigator.clipboard.writeText(content);
    toast.success("انحفظت بالحافظة", { icon: <Check className="size-4" /> });
  } catch { toast.error(t("تعذر النسخ")); }
}
