import { create } from 'zustand';

import type { CreditSummary } from './credit';

/**
 * The latest scan credit the server reported, for screens to show. Null until
 * it's been asked (Mealz only asks once the user has allowed cloud scanning).
 */
export const useCredit = create<{
  summary: CreditSummary | null;
  setSummary: (summary: CreditSummary) => void;
  setBalance: (balanceCents: number) => void;
}>((set) => ({
  summary: null,
  setSummary: (summary) => set({ summary }),
  setBalance: (balanceCents) =>
    set(({ summary }) => ({ summary: summary ? { ...summary, balanceCents } : null })),
}));
