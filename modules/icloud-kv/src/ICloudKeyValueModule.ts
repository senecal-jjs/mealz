import { NativeModule, requireOptionalNativeModule } from 'expo';

declare class ICloudKeyValueModule extends NativeModule<{}> {
  isSignedIn(): boolean;
  getString(key: string): string | null;
  setString(key: string, value: string): void;
  entries(prefix: string): Record<string, string>;
}

// Optional so the app (and tests) still load where the native module isn't built in.
export default requireOptionalNativeModule<ICloudKeyValueModule>('ICloudKeyValue');
