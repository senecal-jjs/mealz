import { Link, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  value?: string;
  href?: Href;
  /** Custom control on the right instead of a value and chevron. */
  accessory?: React.ReactNode;
};

/** One row of a grouped settings list. With `href` it links to an edit screen. */
export function SettingsRow({ label, value, href, accessory }: Props) {
  const theme = useTheme();
  const content = (
    <View style={styles.row}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      {accessory ?? (
        <View style={styles.right}>
          {value ? (
            <ThemedText themeColor="textSecondary" numberOfLines={1} style={styles.value}>
              {value}
            </ThemedText>
          ) : null}
          {href && (
            <SymbolView
              name="chevron.right"
              size={13}
              weight="semibold"
              tintColor={theme.textSecondary}
            />
          )}
        </View>
      )}
    </View>
  );
  if (!href) return content;
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${value ?? ''}`}>
        {content}
      </Pressable>
    </Link>
  );
}

/** A rounded group of rows with an optional title and footnote. */
export function SettingsGroup({
  title,
  footer,
  children,
}: {
  title?: string;
  footer?: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.group}>
      {title && (
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.groupTitle}>
          {title.toUpperCase()}
        </ThemedText>
      )}
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>{children}</View>
      {footer && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
          {footer}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    minHeight: 50,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  label: { fontSize: 17 },
  right: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexShrink: 1 },
  value: { flexShrink: 1, textAlign: 'right' },
  group: { gap: Spacing.one + 2 },
  groupTitle: { fontSize: 13, letterSpacing: 0.5, paddingHorizontal: Spacing.three },
  card: { borderRadius: 14, overflow: 'hidden', borderCurve: 'continuous' },
  footer: { paddingHorizontal: Spacing.three },
});
