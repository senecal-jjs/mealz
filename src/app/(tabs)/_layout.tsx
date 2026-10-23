import { NativeTabs } from 'expo-router/native-tabs';

import { usePlanCount } from '@/features/plan/hooks';
import { useTheme } from '@/hooks/use-theme';

export default function TabLayout() {
  const theme = useTheme();
  const planCount = usePlanCount();

  // Wait for the plan before mounting the tab bar. On iOS 26, a badge that
  // appears just after the tab bar's first layout leaves the labels oversized
  // and truncated ("Rec…") until something else re-lays it out.
  if (planCount === undefined) return null;

  return (
    <NativeTabs tintColor={theme.tint}>
      <NativeTabs.Trigger name="(recipes)">
        <NativeTabs.Trigger.Label>Recipes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'book', selected: 'book.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plan">
        <NativeTabs.Trigger.Label>My Plan</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'fork.knife', selected: 'fork.knife' }} />
        {planCount > 0 && <NativeTabs.Trigger.Badge>{String(planCount)}</NativeTabs.Trigger.Badge>}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="groceries">
        <NativeTabs.Trigger.Label>Groceries</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'cart', selected: 'cart.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
