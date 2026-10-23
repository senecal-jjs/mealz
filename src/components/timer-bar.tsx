import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatCountdown, remainingMs } from '@/domain/timer';
import { useNow, useTimers, type CookTimer } from '@/features/cook/timers';
import { useTheme } from '@/hooks/use-theme';

/** Every running timer as a chip with its countdown; tap one to stop or dismiss it. */
export function TimerBar() {
  const timers = Object.values(useTimers((s) => s.timers)).sort((a, b) => a.endsAt - b.endsAt);
  const now = useNow();
  if (timers.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // ScrollViews grow to fill their parent by default; this one should hug its chips.
      style={styles.scroller}
      contentContainerStyle={styles.bar}>
      {timers.map((t) => (
        <TimerChip key={t.id} timer={t} remaining={remainingMs(t.endsAt, now)} />
      ))}
    </ScrollView>
  );
}

function TimerChip({ timer, remaining }: { timer: CookTimer; remaining: number }) {
  const theme = useTheme();
  const cancel = useTimers((s) => s.cancel);
  const done = remaining === 0;

  // Buzz once when a timer runs out while you're looking at it.
  const buzzed = useRef(false);
  useEffect(() => {
    if (done && !buzzed.current) {
      buzzed.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [done]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        done
          ? `${timer.label} timer done, dismiss`
          : `${timer.label}, ${formatCountdown(remaining)} left, stop timer`
      }
      onPress={() => cancel(timer.id)}
      style={[styles.chip, { backgroundColor: done ? theme.tint : theme.backgroundElement }]}>
      <SymbolView
        name={done ? 'bell.fill' : 'timer'}
        size={14}
        tintColor={done ? theme.onTint : theme.tint}
      />
      <ThemedText type="smallBold" style={{ color: done ? theme.onTint : theme.text }}>
        {done ? 'Done!' : formatCountdown(remaining)}
      </ThemedText>
      <ThemedText type="small" style={{ color: done ? theme.onTint : theme.textSecondary }}>
        {timer.label}
      </ThemedText>
      <SymbolView name="xmark" size={10} tintColor={done ? theme.onTint : theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroller: { flexGrow: 0 },
  bar: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
});
