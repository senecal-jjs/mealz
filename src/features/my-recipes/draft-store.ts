import { create } from 'zustand';

import type { RecipeDraft } from '@/domain/recipe-draft';

/**
 * Hands a prepared draft (e.g. from a scanned photo) to the recipe editor,
 * since route params can't carry it. The editor takes it once on open.
 */
export const usePendingDraft = create<{
  draft: RecipeDraft | null;
  set: (draft: RecipeDraft) => void;
  take: () => RecipeDraft | null;
}>((set, get) => ({
  draft: null,
  set: (draft) => set({ draft }),
  take: () => {
    const { draft } = get();
    set({ draft: null });
    return draft;
  },
}));
