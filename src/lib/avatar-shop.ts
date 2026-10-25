/** Weekly prize per rank: 1st=100, 2nd=80, 3rd=65, ranks 4..10 = 50,40,30,25,20,15,10. */
export const BOARD_PRIZES: Record<number, number> = { 1: 100, 2: 80, 3: 65, 4: 50, 5: 40, 6: 30, 7: 25, 8: 20, 9: 15, 10: 10 };

export type ShopItem = { id: string; category: string; price: number; level_req: number };
export type ShopWallet = { balance: number; level: number; owned: string[]; avatar: Record<string, string> };

export type ItemState = "worn" | "wear" | "locked" | "poor" | "buy";

/** Button state for a catalog item. Free (price 0) counts as owned. */
export function itemState(it: ShopItem, wallet: ShopWallet): ItemState {
  if (wallet.avatar[it.category] === it.id) return "worn";
  if (it.price === 0 || wallet.owned.includes(it.id)) return "wear";
  if (wallet.level < it.level_req) return "locked";
  if (wallet.balance < it.price) return "poor";
  return "buy";
}

/** Week runs Saturday..Friday (Amman). Given a JS day (0=Sun..6=Sat), days left until the week ends. */
export function weekDaysLeft(day: number): number {
  const sinceSaturday = (day - 6 + 7) % 7;
  return Math.max(0, 6 - sinceSaturday);
}
