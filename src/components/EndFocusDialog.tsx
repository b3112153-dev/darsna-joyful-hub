import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { t } from "@/lib/i18n";

export function EndFocusDialog({ open, onOpenChange, onEnd, pending }: { open: boolean; onOpenChange: (open: boolean) => void; onEnd: () => Promise<boolean | void>; pending: boolean }) {
  return <AlertDialog open={open} onOpenChange={onOpenChange}><AlertDialogContent dir="rtl" className="max-w-[calc(100%-2rem)] rounded-2xl sm:max-w-md">
    <AlertDialogHeader><AlertDialogTitle className="text-start">{t("إنهاء الجلسة؟")}</AlertDialogTitle><AlertDialogDescription className="text-start">{t("رح ينحسب الوقت اللي درسته لحد الآن.")}</AlertDialogDescription></AlertDialogHeader>
    <AlertDialogFooter className="gap-2"><AlertDialogCancel disabled={pending}>{t("كمل دراسة")}</AlertDialogCancel><AlertDialogAction disabled={pending} onClick={(event) => { event.preventDefault(); void onEnd().then((saved) => { if (saved !== false) onOpenChange(false); }); }}>{t("إنهاء الجلسة")}</AlertDialogAction></AlertDialogFooter>
  </AlertDialogContent></AlertDialog>;
}