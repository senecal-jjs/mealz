import { ScrollView, StyleSheet, View } from 'react-native';

import {
  AISLE_LABELS,
  AISLES,
  ALLERGEN_LABELS,
  ALLERGENS,
  type IngredientKind,
} from '@/catalog/types';
import { Chip } from '@/components/chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { CustomSpec } from '@/domain/recipe-draft';

export const KIND_LABELS: Record<IngredientKind, string> = {
  plant: 'Plant-based',
  meat: 'Meat',
  poultry: 'Poultry',
  fish: 'Fish',
  shellfish: 'Shellfish',
  dairy: 'Dairy',
  egg: 'Egg',
  honey: 'Honey',
};

type Props = { name: string; value: CustomSpec; onChange: (value: CustomSpec) => void };

/** Asks what a new ingredient is, so diets, allergies and the grocery aisle stay right. */
export function CustomIngredientForm({ name, value, onChange }: Props) {
  const toggleAllergen = (a: (typeof ALLERGENS)[number]) =>
    onChange({
      ...value,
      allergens: value.allergens.includes(a)
        ? value.allergens.filter((x) => x !== a)
        : [...value.allergens, a],
    });

  return (
    <View style={styles.form}>
      <ThemedText type="small" themeColor="textSecondary">
        “{name}” is new to Mealz. What is it?
      </ThemedText>
      <View style={styles.wrap}>
        {(Object.keys(KIND_LABELS) as IngredientKind[]).map((k) => (
          <Chip
            key={k}
            label={KIND_LABELS[k]}
            selected={value.kind === k}
            onPress={() => onChange({ ...value, kind: k })}
          />
        ))}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Grocery aisle
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {AISLES.map((a) => (
          <Chip
            key={a}
            label={AISLE_LABELS[a]}
            selected={value.aisle === a}
            onPress={() => onChange({ ...value, aisle: a })}
          />
        ))}
      </ScrollView>
      <ThemedText type="small" themeColor="textSecondary">
        Contains (optional)
      </ThemedText>
      <View style={styles.wrap}>
        {ALLERGENS.map((a) => (
          <Chip
            key={a}
            label={ALLERGEN_LABELS[a]}
            selected={value.allergens.includes(a)}
            onPress={() => toggleAllergen(a)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.two, paddingTop: Spacing.two },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  row: { gap: Spacing.two },
});
