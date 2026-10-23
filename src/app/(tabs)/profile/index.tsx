import { EmptyState } from '@/components/empty-state';

// Built in M5.
export default function ProfileScreen() {
  return (
    <EmptyState
      icon="person"
      title="Preferences coming soon"
      message="Diet, allergies, dislikes and default servings will live here."
    />
  );
}
