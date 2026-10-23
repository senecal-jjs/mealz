import type { NativeStackNavigationOptions } from 'expo-router';
import { Platform } from 'react-native';

// iOS 26 blurs content under the header on its own (scroll edge effects).
// Earlier versions need a blur, or rows show through the collapsed title.
const needsHeaderBlur = Platform.OS === 'ios' && Number.parseInt(String(Platform.Version), 10) < 26;

/** Blurs whatever scrolls under the header, on iOS versions that need it. */
export const headerBlur: NativeStackNavigationOptions = needsHeaderBlur
  ? { headerBlurEffect: 'systemChromeMaterial' }
  : {};

/** Screen options shared by each tab's stack. */
export const tabStackOptions: NativeStackNavigationOptions = {
  headerLargeTitleEnabled: true,
  ...headerBlur,
};
