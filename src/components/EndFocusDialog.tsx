import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export function EndFocusDialog({ open, onOpenChange, onEnd, pending }: { open: boolean; onOpenChange: (open: boolean) => void; onEnd: () => Promise<boolean | void>; pending: boolean }) {
  return <AlertDialog open={open} onOpenChange={onOpenChange}><AlertDialogContent dir="rtl" className="max-w-[calc(100%-2rem)] rounded-2xl sm:max-w-md">
    <AlertDialogHeader><AlertDialogTitle className="text-start">إنهاء الجلسة؟</AlertDialogTitle><AlertDialogDescription className="text-start">رح ينحسب الوقت اللي درسته لحد الآن.</AlertDialogDescription></AlertDialogHeader>
    <AlertDialogFooter className="gap-2"><AlertDialogCancel disabled={pending}>كمل دراسة</AlertDialogCancel><AlertDialogAction disabled={pending} onClick={(event) => { event.preventDefault(); void onEnd().then((saved) => { if (saved !== false) onOpenChange(false); }); }}>إنهاء الجلسة</AlertDialogAction></AlertDialogFooter>
  </AlertDialogContent></AlertDialog>;
}