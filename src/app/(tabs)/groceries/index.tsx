import { EmptyState } from '@/components/empty-state';

// Built in M3.
export default function GroceriesScreen() {
  return (
    <EmptyState
      icon="cart"
      title="No groceries yet"
      message="Your grocery list builds itself from the recipes in your plan."
    />
  );
}
