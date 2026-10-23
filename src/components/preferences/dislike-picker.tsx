import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useCatalog } from '@/catalog/live';
import { OptionRow } from '@/components/preferences/option-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = { value: string[]; onChange: (ids: string[]) => void };

export function DislikePicker({ value, onChange }: Props) {
  const theme = useTheme();
  const catalog = useCatalog();
  // Staples like salt and oil are in nearly everything, so they aren't offered.
  const choices = useMemo(
    () =>
      [...catalog.ingredients.values()]
        .filter((i) => !i.staple)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [catalog],
  );
  const [query, setQuery] = useState('');
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? choices.filter((i) => i.name.toLowerCase().includes(q)) : choices;
  }, [choices, query]);

  return (
    <View style={styles.container}>
      {value.length > 0 && (
        <View style={styles.chips}>
          {value.map((id) => (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${catalog.ingredients.get(id)?.name ?? id}`}
              onPress={() => toggle(id)}
              style={[styles.chip, { backgroundColor: theme.tint }]}>
              <ThemedText type="smallBold" style={{ color: theme.onTint }}>
                {catalog.ingredients.get(id)?.name ?? id}
              </ThemedText>
              <SymbolView name="xmark" size={10} weight="bold" tintColor={theme.onTint} />
            </Pressable>
          ))}
        </View>
      )}
      <View style={[styles.search, { backgroundColor: theme.backgroundElement }]}>
        <SymbolView name="magnifyingglass" size={16} tintColor={theme.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search ingredients"
          placeholderTextColor={theme.textSecondary}
          autoCorrect={false}
          clearButtonMode="while-editing"
          style={[styles.input, { color: theme.text }]}
        />
      </View>
      <View style={styles.list}>
        {shown.map((i) => (
          <OptionRow
            key={i.id}
            kind="checkbox"
            title={i.name}
            selected={value.includes(i.id)}
            onPress={() => toggle(i.id)}
          />
        ))}
        {shown.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            No ingredients match “{query}”.
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: 999,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
  },
  input: { flex: 1, paddingVertical: Spacing.two + 2, fontSize: 17 },
  list: { gap: Spacing.two },
});
