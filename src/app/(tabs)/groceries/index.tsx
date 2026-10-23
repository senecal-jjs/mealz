import { router, Stack } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Alert, Pressable, SectionList, Share, StyleSheet, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { EmptyState } from '@/components/empty-state';
import { GroceryRow } from '@/components/grocery-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { groceryActions } from '@/features/grocery/hooks';
import {
  buildGrocerySections,
  IN_CART,
  shareText,
  type GroceryRow as Row,
  type GrocerySection,
} from '@/features/grocery/sections';
import { useGroceryList } from '@/features/grocery/use-grocery-list';
import { useTheme } from '@/hooks/use-theme';

const DELETE_RED = '#E5484D';

function promptForItem() {
  Alert.prompt('Add an item', 'Anything else you need, like paper towels.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Add', onPress: (text?: string) => text && groceryActions.addCustom(text) },
  ]);
}

function HeaderButton({
  icon,
  label,
  onPress,
}: {
  icon: SFSymbol;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={8} onPress={onPress}>
      <SymbolView name={icon} size={22} tintColor={theme.tint} />
    </Pressable>
  );
}

export default function GroceriesScreen() {
  const theme = useTheme();
  const { lines, checkedKeys, customItems } = useGroceryList();
  const [showInCart, setShowInCart] = useState(false);

  const sections = useMemo(
    () => buildGrocerySections(lines, checkedKeys, customItems),
    [lines, checkedKeys, customItems],
  );
  const total = lines.length + customItems.length;
  const inCart = sections.find((s) => s.key === IN_CART)?.data.length ?? 0;

  const header = (
    <Stack.Screen
      options={{
        headerRight: () => (
          <View style={styles.headerButtons}>
            {total > 0 && (
              <HeaderButton
                icon="square.and.arrow.up"
                label="Share list"
                onPress={() => Share.share({ message: shareText(sections) })}
              />
            )}
            <HeaderButton icon="plus" label="Add item" onPress={promptForItem} />
          </View>
        ),
      }}
    />
  );

  if (total === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon="cart"
          title="No groceries yet"
          message="Your grocery list builds itself from the recipes in your plan."
          action={{ label: 'Browse recipes', onPress: () => router.navigate('/') }}
        />
      </>
    );
  }

  // "In cart" collapses so the list stays focused on what's left to buy.
  const visible = sections.map((s) => (s.key === IN_CART && !showInCart ? { ...s, data: [] } : s));

  const renderRow = (row: Row) => {
    if (row.kind === 'line') {
      return (
        <GroceryRow
          amount={row.line.amount}
          name={row.line.optional ? `${row.line.name} (optional)` : row.line.name}
          detail={row.line.recipeTitles.join(', ')}
          checked={row.checked}
          onToggle={() => groceryActions.setLineChecked(row.line.key, !row.checked)}
        />
      );
    }
    const { item } = row;
    return (
      <Swipeable
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        renderRightActions={() => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.customName}`}
            onPress={() => groceryActions.removeCustom(item.id)}
            style={styles.delete}>
            <SymbolView name="trash" size={20} tintColor="#fff" />
          </Pressable>
        )}>
        <GroceryRow
          name={item.customName ?? ''}
          checked={item.checked}
          onToggle={() => groceryActions.setCustomChecked(item.id, !item.checked)}
        />
      </Swipeable>
    );
  };

  const renderSectionHeader = ({ section }: { section: GrocerySection }) => {
    const isCart = section.key === IN_CART;
    const title = (
      <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
        <View style={styles.sectionTitleRow}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            {isCart ? `${section.title} (${inCart})` : section.title}
          </ThemedText>
          {isCart && (
            <SymbolView
              name={showInCart ? 'chevron.down' : 'chevron.right'}
              size={12}
              weight="semibold"
              tintColor={theme.textSecondary}
            />
          )}
        </View>
        {section.hint && (
          <ThemedText type="small" themeColor="textSecondary">
            {section.hint}
          </ThemedText>
        )}
      </View>
    );
    if (!isCart) return title;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: showInCart }}
        onPress={() => setShowInCart((v) => !v)}>
        {title}
      </Pressable>
    );
  };

  return (
    <>
      {header}
      <SectionList
        sections={visible}
        keyExtractor={(row) => `${row.kind}:${row.key}`}
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled={false}
        // Lists are a few dozen rows; render them all so fast scrolls never show gaps.
        initialNumToRender={100}
        ListHeaderComponent={
          <ThemedText type="small" themeColor="textSecondary" style={styles.summary}>
            {total - inCart} to buy · {inCart} in cart
          </ThemedText>
        }
        renderSectionHeader={renderSectionHeader}
        ListFooterComponent={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add an item to the list"
            onPress={promptForItem}
            style={styles.addRow}>
            <SymbolView name="plus.circle.fill" size={24} tintColor={theme.tint} />
            <ThemedText style={{ color: theme.tint }}>Add an item</ThemedText>
          </Pressable>
        }
        renderItem={({ item }) => renderRow(item)}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: Spacing.six },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  summary: { paddingHorizontal: Spacing.three },
  sectionHeader: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.one,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 13 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.three + 24 + Spacing.three },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
  },
  delete: {
    width: 72,
    backgroundColor: DELETE_RED,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
