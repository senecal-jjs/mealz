import native from './src/ICloudDriveModule';

/**
 * Files in the app's own iCloud Drive folder, hidden from the Files app.
 * Where the native module isn't built in (Android, Expo Go, tests), iCloud
 * Drive is simply unavailable.
 */
export const iCloudDrive = native;
