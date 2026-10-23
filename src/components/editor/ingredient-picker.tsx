import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { Ingredient } from '@/catalog/types';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  visible: boolean;
  ingredients: Ingredient[];
  initialQuery: string;
  onPick: (choice: string | 'new') => void;
  onClose: () => void;
};

/** A sheet for choosing which known ingredient a line means, or marking it as new. */
export function IngredientPicker({ visible, ingredients, initialQuery, onPick, onClose }: Props) {
  const theme = useTheme();
  const [query, setQuery] = useState(initialQuery);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...ingredients].sort((a, b) => a.name.localeCompare(b.name));
    return q ? sorted.filter((i) => i.name.toLowerCase().includes(q)) : sorted;
  }, [ingredients, query]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onShow={() => setQuery(initialQuery)}>
      <View style={[styles.sheet, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <ThemedText type="smallBold" style={styles.title}>
            Which ingredient?
          </ThemedText>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={onClose}>
            <ThemedText style={{ color: theme.tint }}>Cancel</ThemedText>
          </Pressable>
        </View>
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
        <FlatList
          data={shown}
          keyExtractor={(i) => i.id}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Pressable
              accessibilityRole="button"
              onPress={() => onPick('new')}
              style={[styles.row, { borderColor: theme.border }]}>
              <SymbolView name="plus.circle" size={20} tintColor={theme.tint} />
              <ThemedText style={{ color: theme.tint }}>
                Not listed — add as a new ingredient
              </ThemedText>
            </Pressable>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => onPick(item.id)}
              style={[styles.row, { borderColor: theme.border }]}>
              <ThemedText>{item.name}</ThemedText>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, paddingTop: Spacing.three },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  title: { fontSize: 18 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
  },
  input: { flex: 1, paddingVertical: Spacing.two + 2, fontSize: 17 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
