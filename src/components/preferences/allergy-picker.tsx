import { StyleSheet, View } from 'react-native';

import { ALLERGEN_LABELS, ALLERGENS, type Allergen } from '@/catalog/types';
import { OptionRow } from '@/components/preferences/option-row';
import { Spacing } from '@/constants/theme';

type Props = { value: Allergen[]; onChange: (allergies: Allergen[]) => void };

export function AllergyPicker({ value, onChange }: Props) {
  const toggle = (a: Allergen) =>
    onChange(value.includes(a) ? value.filter((x) => x !== a) : [...value, a]);

  return (
    <View style={styles.list}>
      {ALLERGENS.map((a) => (
        <OptionRow
          key={a}
          kind="checkbox"
          title={ALLERGEN_LABELS[a]}
          selected={value.includes(a)}
          onPress={() => toggle(a)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ list: { gap: Spacing.two } });
