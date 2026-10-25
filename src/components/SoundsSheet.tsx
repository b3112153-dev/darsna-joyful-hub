import { useState, useSyncExternalStore } from "react";
import { Pause, Play, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { SOUNDS, soundEngine, type SoundId } from "@/lib/sounds";
import { t } from "@/lib/i18n";

function usePlaying() {
  return useSyncExternalStore(soundEngine.subscribe, () => soundEngine.playingIds().join(","));
}

export function SoundsSheet({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [volumes, setVolumes] = useState<Record<SoundId, number>>({ rain: 0.6, fire: 0.6, sea: 0.6, birds: 0.6 });
  const playing = usePlaying();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" dir="rtl" className="rounded-t-[26px] font-display">
        <SheetHeader><SheetTitle>{t("أصوات الدراسة")}</SheetTitle></SheetHeader>
        <div className="grid grid-cols-2 gap-3 py-4">
          {SOUNDS.map((sound) => {
            const active = playing.split(",").includes(sound.id);
            return (
              <div key={sound.id} className={`rounded-[20px] border p-3 ${active ? "border-primary bg-secondary" : "bg-card"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold">{sound.emoji} {sound.label}</span>
                  <Button size="icon" variant={active ? "default" : "outline"} className="size-9 rounded-full" aria-label={active ? `إيقاف ${sound.label}` : `تشغيل ${sound.label}`}
                    onClick={() => soundEngine.toggle(sound.id, volumes[sound.id])}>
                    {active ? <Pause className="size-4" /> : <Play className="size-4" />}
                  </Button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Volume2 className="size-4 shrink-0 text-muted-foreground" />
                  <Slider dir="ltr" min={0} max={100} value={[Math.round(volumes[sound.id] * 100)]} aria-label={`حجم صوت ${sound.label}`}
                    onValueChange={([v]) => {
                      const volume = (v ?? 60) / 100;
                      setVolumes((current) => ({ ...current, [sound.id]: volume }));
                      soundEngine.setVolume(sound.id, volume);
                    }} />
                </div>
              </div>
            );
          })}
          <div className="col-span-2 grid place-items-center rounded-[20px] border-2 border-dashed p-4 text-sm font-semibold text-muted-foreground" aria-disabled>
            {t("🕌 القرآن — قريباً")}
          </div>
        </div>
        <p className="pb-2 text-center text-xs text-muted-foreground">{t("تقدر تدمج أكثر من صوت، وبيوقفوا لحالهم لما تخلص الجلسة.")}</p>
      </SheetContent>
    </Sheet>
  );
}
