import native from './src/ICloudKeyValueModule';

/**
 * iCloud key-value storage: small strings that follow the user's Apple ID.
 * Everything is a no-op where the native module isn't built in (Android,
 * Expo Go, tests).
 */
export const iCloudKeyValue = {
  isSignedIn: () => native?.isSignedIn() ?? false,
  getString: (key: string) => native?.getString(key) ?? null,
  setString: (key: string, value: string) => native?.setString(key, value),
  entries: (prefix: string): Record<string, string> => native?.entries(prefix) ?? {},
};
