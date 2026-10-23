import { EmptyState } from '@/components/empty-state';

// Built in M2.
export default function PlanScreen() {
  return (
    <EmptyState
      icon="fork.knife"
      title="Your plan is empty"
      message="Recipes you add from the Recipes tab will show up here."
    />
  );
}
