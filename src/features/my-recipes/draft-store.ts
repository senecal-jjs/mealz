import { create } from 'zustand';

import type { RecipeDraft } from '@/domain/recipe-draft';

type Pending = { draft: RecipeDraft; notes: string[] };

/**
 * Hands a prepared draft (e.g. from a scanned photo) to the recipe editor,
 * since route params can't carry it, with any notes for the cook to check.
 * The editor takes it once on open.
 */
export const usePendingDraft = create<{
  pending: Pending | null;
  set: (draft: RecipeDraft, notes?: string[]) => void;
  take: () => Pending | null;
}>((set, get) => ({
  pending: null,
  set: (draft, notes = []) => set({ pending: { draft, notes } }),
  take: () => {
    const { pending } = get();
    set({ pending: null });
    return pending;
  },
}));
