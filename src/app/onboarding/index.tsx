import { router } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const POINTS: { icon: SFSymbol; title: string; body: string }[] = [
  { icon: 'book', title: 'Pick a few recipes', body: 'Quick weeknight meals that fit your diet.' },
  { icon: 'cart', title: 'Shop one list', body: 'Everything merged and sorted by aisle.' },
  { icon: 'flame', title: 'Cook step by step', body: 'Big type, built-in timers, no scrolling.' },
];

export default function WelcomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top + Spacing.six,
          paddingBottom: insets.bottom + Spacing.two,
        },
      ]}>
      <View style={styles.hero}>
        <SymbolView name="fork.knife.circle.fill" size={88} tintColor={theme.tint} />
        <ThemedText type="subtitle" style={styles.title}>
          Welcome to Mealz
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.center}>
          A few quick questions so we only show recipes that work for you.
        </ThemedText>
      </View>
      <View style={styles.points}>
        {POINTS.map((p) => (
          <View key={p.title} style={styles.point}>
            <View style={[styles.pointIcon, { backgroundColor: theme.tintSoft }]}>
              <SymbolView name={p.icon} size={20} tintColor={theme.tint} />
            </View>
            <View style={styles.pointText}>
              <ThemedText type="smallBold" style={styles.pointTitle}>
                {p.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {p.body}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>
      <Button label="Get started" onPress={() => router.push('/onboarding/diet')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: Spacing.four, justifyContent: 'space-between' },
  hero: { alignItems: 'center', gap: Spacing.three },
  title: { fontSize: 32, lineHeight: 38, textAlign: 'center' },
  center: { textAlign: 'center' },
  points: { gap: Spacing.four },
  point: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  pointIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointText: { flex: 1 },
  pointTitle: { fontSize: 17 },
});
