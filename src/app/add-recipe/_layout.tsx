import { Stack } from 'expo-router';

/** Adding a recipe: a modal with its own stack, so scanning keeps a back button to the start. */
export default function AddRecipeLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Add a Recipe' }} />
      <Stack.Screen name="scan" options={{ title: '' }} />
    </Stack>
  );
}
