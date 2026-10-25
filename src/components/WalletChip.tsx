import { Coins } from "lucide-react";
import { fmtJD, useWallet } from "@/hooks/use-wallet";
import { cn } from "@/lib/utils";

export function WalletChip({ userId, className }: { userId: string | undefined; className?: string }) {
  const { data } = useWallet(userId);
  if (!data) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm font-bold shadow-card", className)}>
      <Coins className="size-4 text-primary" />
      مصاريك: {fmtJD(data.balance)} JD
    </span>
  );
}
