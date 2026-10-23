import { StyleSheet, View } from 'react-native';

import { DIET_LABELS, type Diet } from '@/catalog/types';
import { OptionRow } from '@/components/preferences/option-row';
import { Spacing } from '@/constants/theme';

const OPTIONS: { value: Diet | null; title: string; subtitle: string }[] = [
  { value: null, title: 'No restrictions', subtitle: 'I eat everything' },
  { value: 'vegetarian', title: DIET_LABELS.vegetarian, subtitle: 'No meat or fish' },
  { value: 'vegan', title: DIET_LABELS.vegan, subtitle: 'No animal products at all' },
  { value: 'pescatarian', title: DIET_LABELS.pescatarian, subtitle: 'Fish and seafood, no meat' },
  { value: 'low-carb', title: DIET_LABELS['low-carb'], subtitle: 'Easy on starches and sugar' },
];

type Props = { value: Diet | null; onChange: (diet: Diet | null) => void };

export function DietPicker({ value, onChange }: Props) {
  return (
    <View style={styles.list} accessibilityRole="radiogroup">
      {OPTIONS.map((o) => (
        <OptionRow
          key={o.value ?? 'none'}
          kind="radio"
          title={o.title}
          subtitle={o.subtitle}
          selected={value === o.value}
          onPress={() => onChange(o.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ list: { gap: Spacing.two } });
