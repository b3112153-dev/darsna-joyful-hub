import { Button } from "@/components/ui/button";
import { groupReactions, type ReactionRow } from "@/lib/reactions";
import { t } from "@/lib/i18n";
export function ReactionBar({ rows, id, userId, onReact }: { rows: ReactionRow[]; id: string; userId?: string; onReact: (emoji: string) => void }) {
  return <div className="mt-1 flex max-w-full flex-wrap gap-1">{groupReactions(rows, id, userId).map((chip) => <Button key={chip.emoji} type="button" size="sm" variant="outline" onClick={() => onReact(chip.emoji)} aria-label={`${t("تفاعل")} ${chip.emoji}`} aria-pressed={chip.mine} className={`h-7 rounded-full px-2 text-xs ${chip.mine ? "border-primary bg-secondary font-bold" : "bg-card"}`}>{chip.emoji} {chip.count}</Button>)}</div>;
}