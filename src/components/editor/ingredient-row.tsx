import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { Ingredient } from '@/catalog/types';
import { CustomIngredientForm, KIND_LABELS } from '@/components/editor/custom-ingredient-form';
import { IngredientPicker } from '@/components/editor/ingredient-picker';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatIngredient } from '@/domain/quantity';
import { resolveIngredient, type DraftIngredient } from '@/domain/recipe-draft';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  item: DraftIngredient;
  index: number;
  known: Map<string, Ingredient>;
  onChange: (item: DraftIngredient) => void;
  /** Called with extra lines when several are pasted at once. */
  onPasteLines: (lines: string[]) => void;
  onRemove: () => void;
};

/**
 * One ingredient, typed as a line ("2 large yellow onions, diced"). Below it,
 * what Mealz understood: the matched ingredient, or questions about a new one.
 */
export function IngredientRow({ item, index, known, onChange, onPasteLines, onRemove }: Props) {
  const theme = useTheme();
  const [picking, setPicking] = useState(false);
  const [editingNew, setEditingNew] = useState(false);
  const { parsed, match, isNew } = resolveIngredient(item, known);
  const hasText = item.line.trim().length > 0;

  const setLine = (text: string) => {
    const lines = text.split(/\r?\n/).map((l) => l.trim());
    if (lines.length > 1) {
      onChange({ ...item, line: lines[0], override: null });
      onPasteLines(lines.slice(1).filter(Boolean));
    } else {
      // Retyping the line re-matches it, unless the user said it's new.
      onChange({ ...item, line: text, override: item.override === 'new' ? 'new' : null });
    }
  };

  const needsAnswer = isNew && hasText && !item.custom.kind;
  const showForm = isNew && hasText && (needsAnswer || editingNew);

  return (
    <View style={[styles.row, { borderColor: theme.border }]}>
      <View style={styles.inputRow}>
        <TextInput
          value={item.line}
          onChangeText={setLine}
          placeholder={index === 0 ? 'e.g. 2 large yellow onions, diced' : 'Ingredient'}
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel={`Ingredient ${index + 1}`}
          multiline
          blurOnSubmit
          returnKeyType="done"
          style={[styles.input, { color: theme.text }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ingredient ${index + 1}`}
          hitSlop={8}
          onPress={onRemove}>
          <SymbolView name="minus.circle.fill" size={22} tintColor="#E5484D" />
        </Pressable>
      </View>

      {hasText && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            match ? `Matched to ${match.name}. Change` : `New ingredient ${parsed.name}. Change`
          }
          onPress={() => (isNew && item.custom.kind ? setEditingNew((v) => !v) : setPicking(true))}
          onLongPress={() => setPicking(true)}
          style={styles.status}>
          <SymbolView
            name={
              match
                ? 'checkmark.circle.fill'
                : needsAnswer
                  ? 'exclamationmark.circle.fill'
                  : 'sparkles'
            }
            size={14}
            tintColor={match ? theme.tint : needsAnswer ? '#E5A000' : theme.textSecondary}
          />
          <ThemedText
            type="small"
            themeColor="textSecondary"
            numberOfLines={1}
            style={styles.statusText}>
            {match
              ? [formatIngredient(parsed, match).amount, match.name].filter(Boolean).join(' · ')
              : item.custom.kind
                ? `New: ${parsed.name} · ${KIND_LABELS[item.custom.kind]}`
                : `New ingredient: ${parsed.name || '…'}`}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.tint }}>
            {isNew && item.custom.kind ? (editingNew ? 'Done' : 'Edit') : 'Change'}
          </ThemedText>
        </Pressable>
      )}

      {showForm && (
        <CustomIngredientForm
          name={parsed.name}
          value={item.custom}
          onChange={(custom) => onChange({ ...item, custom })}
        />
      )}

      <IngredientPicker
        visible={picking}
        ingredients={[...known.values()]}
        initialQuery={parsed.name}
        onClose={() => setPicking(false)}
        onPick={(choice) => {
          setPicking(false);
          onChange({ ...item, override: choice });
          if (choice === 'new') setEditingNew(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  input: { flex: 1, fontSize: 17, paddingVertical: Spacing.one },
  status: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  statusText: { flex: 1 },
});
