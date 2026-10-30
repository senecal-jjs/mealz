import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { localDay } from '@/domain/browse';

/** Today's date ("2026-10-30"), updated when the app comes back to the foreground on a new day. */
export function useLocalDay(): string {
  const [day, setDay] = useState(localDay);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setDay(localDay());
    });
    return () => subscription.remove();
  }, []);
  return day;
}
