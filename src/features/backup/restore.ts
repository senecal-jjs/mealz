import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';

import {
  declineRestore,
  isBackupAvailable,
  restorableRecipes,
  restoreRecipes,
  syncBackup,
} from './backup';

const recipes = (n: number) => (n === 1 ? '1 recipe' : `${n} recipes`);

/** Asks whether to restore recipes from the backup, and restores them on yes. */
export function offerRestore(ids: string[]) {
  Alert.alert(
    `Restore ${recipes(ids.length)} from iCloud?`,
    'Recipes you added are in your iCloud backup but not on this iPhone.',
    [
      {
        text: 'Not Now',
        style: 'cancel',
        onPress: () => {
          declineRestore(ids);
          Alert.alert(
            ids.length === 1
              ? 'Your recipe is still in iCloud'
              : 'Your recipes are still in iCloud',
            `You can restore ${ids.length === 1 ? 'it' : 'them'} anytime from Profile → Restore from iCloud.`,
          );
        },
      },
      {
        text: 'Restore',
        onPress: async () => {
          const restored = await restoreRecipes(ids);
          if (restored === ids.length) {
            Alert.alert(
              restored === 1 ? 'Recipe restored' : 'Recipes restored',
              `${recipes(restored)} from iCloud ${restored === 1 ? 'is' : 'are'} back in your recipes.`,
            );
          } else {
            Alert.alert(
              'Some recipes weren’t restored',
              `${recipes(restored)} restored. Check your connection and try again from Profile.`,
            );
          }
        },
      },
    ],
  );
}

/**
 * Brings the iCloud backup up to date on launch, and offers to restore
 * recipes that are in it but not on this phone (a new iPhone, a reinstall).
 */
export function useBackupSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled || Platform.OS !== 'ios') return;
    void syncBackup().then((ids) => {
      if (ids.length) offerRestore(ids);
    });
  }, [enabled]);
}

/** Profile's "Restore from iCloud": every backed-up recipe missing here, even declined ones. */
export async function restoreFromProfile() {
  if (!(await isBackupAvailable())) {
    Alert.alert(
      'iCloud Drive isn’t available',
      'Sign in to iCloud and turn on iCloud Drive in Settings to back up and restore your recipes.',
    );
    return;
  }
  const ids = await restorableRecipes().catch(() => []);
  if (ids.length === 0) {
    Alert.alert(
      'Nothing to restore',
      'Every recipe in your iCloud backup is already on this iPhone.',
    );
    return;
  }
  offerRestore(ids);
}
