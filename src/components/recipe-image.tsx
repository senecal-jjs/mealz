import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Recipe } from '@/catalog/types';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Soft placeholder colors until real photos exist (PLAN.md §9).
const PLACEHOLDERS = {
  light: ['#F6E7D8', '#E3F0E1', '#E2ECF5', '#F4E1E4', '#EFE8D2', '#E6E2F3'],
  dark: ['#3A2E24', '#24342A', '#22303D', '#3A2629', '#36321F', '#2C2840'],
};

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

type Props = {
  recipe: Pick<Recipe, 'id' | 'image'>;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
};

export function RecipeImage({ recipe, style, iconSize = 40 }: Props) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  if (recipe.image) {
    return (
      <View style={[styles.fill, style]}>
        <Image source={recipe.image} style={StyleSheet.absoluteFill} contentFit="cover" />
      </View>
    );
  }

  const colors = PLACEHOLDERS[scheme];
  const background = colors[hash(recipe.id) % colors.length];
  return (
    <View style={[styles.fill, styles.placeholder, { backgroundColor: background }, style]}>
      <SymbolView
        name="fork.knife"
        size={iconSize}
        tintColor={scheme === 'dark' ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.2)'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { width: '100%' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
