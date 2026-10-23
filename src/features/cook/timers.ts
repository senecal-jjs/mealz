/**
 * Cooking timers. They live in memory (a Zustand store) so they keep running
 * when you swipe between steps or leave cook mode, and each one schedules a
 * notification for when it ends in case the app is in the background.
 */
import { useEffect, useState } from 'react';
import { create } from 'zustand';

import { cancelTimerAlert, scheduleTimerAlert } from '@/features/cook/notifications';

export type CookTimer = {
  id: string;
  /** "Step 3 · Shakshuka" */
  label: string;
  endsAt: number;
  alertId: string | null;
};

type TimerStore = {
  timers: Record<string, CookTimer>;
  start: (id: string, label: string, minutes: number) => Promise<void>;
  cancel: (id: string) => Promise<void>;
  /** Stops every timer whose id starts with `${recipeId}:`. */
  cancelRecipe: (recipeId: string) => Promise<void>;
};

export const useTimers = create<TimerStore>((set, get) => ({
  timers: {},
  start: async (id, label, minutes) => {
    await get().cancel(id);
    const endsAt = Date.now() + minutes * 60_000;
    set((s) => ({ timers: { ...s.timers, [id]: { id, label, endsAt, alertId: null } } }));
    const alertId = await scheduleTimerAlert('Timer done', label, minutes * 60);
    set((s) =>
      s.timers[id]?.endsAt === endsAt
        ? { timers: { ...s.timers, [id]: { ...s.timers[id], alertId } } }
        : s,
    );
  },
  cancel: async (id) => {
    const timer = get().timers[id];
    if (!timer) return;
    set((s) => {
      const { [id]: _, ...rest } = s.timers;
      return { timers: rest };
    });
    if (timer.alertId) await cancelTimerAlert(timer.alertId);
  },
  cancelRecipe: async (recipeId) => {
    const ids = Object.keys(get().timers).filter((id) => id.startsWith(`${recipeId}:`));
    await Promise.all(ids.map((id) => get().cancel(id)));
  },
}));

/** The current time, updated every `intervalMs` while the component is mounted. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
