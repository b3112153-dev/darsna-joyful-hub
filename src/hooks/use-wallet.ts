import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AvatarState = Record<string, string>;

export type Wallet = {
  balance: number;
  hours: number;
  level: number;
  nickname: string | null;
  nickname_changed_at: string | null;
  avatar: AvatarState;
  owned: string[];
};

export function parseWallet(raw: unknown): Wallet {
  const w = (raw ?? {}) as Record<string, unknown>;
  return {
    balance: Number(w.balance ?? 0),
    hours: Number(w.hours ?? 0),
    level: Math.max(1, Number(w.level ?? 1)),
    nickname: typeof w.nickname === "string" ? w.nickname : null,
    nickname_changed_at: typeof w.nickname_changed_at === "string" ? w.nickname_changed_at : null,
    avatar: w.avatar && typeof w.avatar === "object" && !Array.isArray(w.avatar) ? (w.avatar as AvatarState) : {},
    owned: Array.isArray(w.owned) ? (w.owned as string[]) : [],
  };
}

export function useWallet(userId: string | undefined) {
  return useQuery({
    queryKey: ["wallet", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_wallet");
      if (error) throw error;
      return parseWallet(data);
    },
  });
}

export function fmtJD(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
