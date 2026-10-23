import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getIngredient, getRecipe } from '@/catalog';
import type { Recipe, RecipeIngredient, Step } from '@/catalog/types';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { TimerBar } from '@/components/timer-bar';
import { Spacing } from '@/constants/theme';
import { formatIngredient, scaleFactor } from '@/domain/quantity';
import { formatCountdown, remainingMs } from '@/domain/timer';
import { useNow, useTimers } from '@/features/cook/timers';
import { planActions, usePlannedServings } from '@/features/plan/hooks';
import { DEFAULT_SERVINGS } from '@/features/plan/plan';
import { useTheme } from '@/hooks/use-theme';

export default function CookScreen() {
  useKeepAwake();
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipe = getRecipe(id);
  const plannedServings = usePlannedServings().get(id);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pager = useRef<ScrollViewInstance>(null);
  const [page, setPage] = useState(0);
  const dragging = useRef(false);

  if (!recipe) {
    return (
      <View style={[styles.missing, { backgroundColor: theme.background }]}>
        <ThemedText>This recipe isn’t available.</ThemedText>
        <Button label="Close" onPress={() => router.back()} />
      </View>
    );
  }

  const servings = plannedServings ?? DEFAULT_SERVINGS;
  const factor = scaleFactor(recipe.baseServings, servings);
  // Page 0 is "Get ready", then one page per step, then "All done".
  const lastPage = recipe.steps.length + 1;

  const goTo = (target: number) => {
    const next = Math.max(0, Math.min(lastPage, target));
    setPage(next);
    pager.current?.scrollTo({ x: next * width, animated: true });
  };

  const progress =
    page === 0
      ? 'Get ready'
      : page === lastPage
        ? 'All done'
        : `Step ${page} of ${recipe.steps.length}`;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close cook mode"
          hitSlop={12}
          onPress={() => router.back()}
          style={[styles.close, { backgroundColor: theme.backgroundElement }]}>
          <SymbolView name="xmark" size={14} weight="bold" tintColor={theme.text} />
        </Pressable>
        <View style={styles.topText}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {recipe.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {progress}
          </ThemedText>
        </View>
      </View>
      <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
        <View
          style={[
            styles.fill,
            { backgroundColor: theme.tint, width: `${(page / lastPage) * 100}%` },
          ]}
        />
      </View>
      <TimerBar />

      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        // Only swipes set the page here. Back/Next set it directly, and their animated
        // scrolls also end in this event, which would undo a quick second tap.
        onScrollBeginDrag={() => (dragging.current = true)}
        onMomentumScrollEnd={(e) => {
          if (!dragging.current) return;
          dragging.current = false;
          setPage(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        style={styles.pager}>
        <Page width={width}>
          <GetReady recipe={recipe} servings={servings} factor={factor} />
        </Page>
        {recipe.steps.map((step, i) => (
          <Page key={i} width={width}>
            <StepPage recipe={recipe} step={step} index={i} factor={factor} />
          </Page>
        ))}
        <Page width={width}>
          <Finish recipe={recipe} planned={plannedServings !== undefined} />
        </Page>
      </ScrollView>

      <View style={[styles.nav, { paddingBottom: insets.bottom + Spacing.two }]}>
        {page > 0 && (
          <Button
            variant="secondary"
            label="Back"
            onPress={() => goTo(page - 1)}
            style={styles.navButton}
          />
        )}
        {page < lastPage && (
          <Button
            label={page === 0 ? 'Start cooking' : 'Next'}
            onPress={() => goTo(page + 1)}
            style={styles.navButton}
          />
        )}
      </View>
    </View>
  );
}

function Page({ width, children }: { width: number; children: React.ReactNode }) {
  return (
    <ScrollView style={{ width }} contentContainerStyle={styles.page}>
      {children}
    </ScrollView>
  );
}

function IngredientLine({
  item,
  factor,
  checked,
  onToggle,
}: {
  item: RecipeIngredient;
  factor: number;
  checked?: boolean;
  onToggle?: () => void;
}) {
  const theme = useTheme();
  const { amount, name } = formatIngredient(item, getIngredient(item.ingredient), factor);
  const text = (
    <View style={styles.ingredientText}>
      <ThemedText style={checked && { color: theme.textSecondary }}>
        {amount ? <ThemedText style={styles.bold}>{amount} </ThemedText> : null}
        {name}
        {item.quantity === null ? ', to taste' : ''}
      </ThemedText>
      {(item.prep || item.optional) && (
        <ThemedText type="small" themeColor="textSecondary">
          {[item.prep, item.optional && 'optional'].filter(Boolean).join(' · ')}
        </ThemedText>
      )}
    </View>
  );
  if (!onToggle) return <View style={styles.ingredient}>{text}</View>;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={styles.ingredient}>
      <SymbolView
        name={checked ? 'checkmark.circle.fill' : 'circle'}
        size={24}
        tintColor={checked ? theme.tint : theme.textSecondary}
      />
      {text}
    </Pressable>
  );
}

function GetReady({
  recipe,
  servings,
  factor,
}: {
  recipe: Recipe;
  servings: number;
  factor: number;
}) {
  const [ready, setReady] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setReady((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <ThemedText type="subtitle" style={styles.heading}>
        Get ready
      </ThemedText>
      <ThemedText themeColor="textSecondary">
        {servings} servings · about {recipe.totalMinutes} min. Gather everything before you start.
      </ThemedText>
      <View style={styles.list}>
        {recipe.ingredients.map((item) => (
          <IngredientLine
            key={item.id}
            item={item}
            factor={factor}
            checked={ready.has(item.id)}
            onToggle={() => toggle(item.id)}
          />
        ))}
      </View>
    </>
  );
}

function StepPage({
  recipe,
  step,
  index,
  factor,
}: {
  recipe: Recipe;
  step: Step;
  index: number;
  factor: number;
}) {
  const theme = useTheme();
  const used = step.uses.flatMap((ref) => recipe.ingredients.filter((i) => i.id === ref));

  return (
    <>
      <ThemedText type="smallBold" style={[styles.stepLabel, { color: theme.tint }]}>
        STEP {index + 1}
      </ThemedText>
      <ThemedText style={styles.stepText}>{step.text}</ThemedText>
      {step.timerMinutes && (
        <StepTimer
          id={`${recipe.id}:${index}`}
          label={`Step ${index + 1} · ${recipe.title}`}
          minutes={step.timerMinutes}
        />
      )}
      {used.length > 0 && (
        <View style={[styles.uses, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            FOR THIS STEP
          </ThemedText>
          {used.map((item) => (
            <IngredientLine key={item.id} item={item} factor={factor} />
          ))}
        </View>
      )}
    </>
  );
}

function StepTimer({ id, label, minutes }: { id: string; label: string; minutes: number }) {
  const timer = useTimers((s) => s.timers[id]);
  const { start, cancel } = useTimers.getState();
  const now = useNow();

  if (!timer) {
    return (
      <Button
        icon="timer"
        variant="secondary"
        label={`Start ${minutes} min timer`}
        onPress={() => start(id, label, minutes)}
        style={styles.timerButton}
      />
    );
  }
  const remaining = remainingMs(timer.endsAt, now);
  return (
    <Button
      icon={remaining ? 'stop.fill' : 'bell.fill'}
      label={remaining ? `${formatCountdown(remaining)} left · Stop` : 'Time’s up · Dismiss'}
      onPress={() => cancel(id)}
      style={styles.timerButton}
    />
  );
}

function Finish({ recipe, planned }: { recipe: Recipe; planned: boolean }) {
  const theme = useTheme();
  const [rating, setRating] = useState(0);

  const finish = async () => {
    await useTimers.getState().cancelRecipe(recipe.id);
    if (planned) await planActions.markCooked(recipe.id, rating || undefined);
    router.back();
  };

  return (
    <View style={styles.finish}>
      <SymbolView name="fork.knife.circle.fill" size={72} tintColor={theme.tint} />
      <ThemedText type="subtitle" style={[styles.heading, styles.center]}>
        Enjoy your meal!
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.center}>
        How did {recipe.title} turn out?
      </ThemedText>
      <View style={styles.stars} accessibilityRole="radiogroup" accessibilityLabel="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            accessibilityRole="radio"
            accessibilityLabel={`${n} ${n === 1 ? 'star' : 'stars'}`}
            accessibilityState={{ checked: rating === n }}
            hitSlop={4}
            onPress={() => setRating(rating === n ? 0 : n)}>
            <SymbolView
              name={n <= rating ? 'star.fill' : 'star'}
              size={36}
              tintColor={n <= rating ? '#F5A524' : theme.textSecondary}
            />
          </Pressable>
        ))}
      </View>
      <Button
        icon="checkmark"
        label={planned ? 'Mark as cooked' : 'Done'}
        onPress={finish}
        style={styles.finishButton}
      />
      {planned && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          It leaves your plan and goes to your history.
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topText: { flex: 1 },
  track: { height: 4, marginHorizontal: Spacing.three, borderRadius: 2, marginBottom: Spacing.two },
  fill: { height: 4, borderRadius: 2 },
  pager: { flex: 1 },
  page: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  heading: { fontSize: 30, lineHeight: 36 },
  list: { marginTop: Spacing.two },
  ingredient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  ingredientText: { flex: 1 },
  bold: { fontWeight: 700 },
  stepLabel: { letterSpacing: 1 },
  stepText: { fontSize: 24, lineHeight: 34, fontWeight: 500 },
  timerButton: { alignSelf: 'flex-start' },
  uses: { borderRadius: 16, padding: Spacing.three, gap: Spacing.one, marginTop: Spacing.two },
  finish: { alignItems: 'center', gap: Spacing.three, paddingTop: Spacing.five },
  center: { textAlign: 'center' },
  stars: { flexDirection: 'row', gap: Spacing.two, marginVertical: Spacing.two },
  finishButton: { alignSelf: 'stretch', marginTop: Spacing.two },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  navButton: { flex: 1 },
});
