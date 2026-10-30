import { NativeModule, requireOptionalNativeModule } from 'expo';

declare class ICloudDriveModule extends NativeModule<{}> {
  isAvailable(): Promise<boolean>;
  writeText(path: string, text: string): Promise<void>;
  readText(path: string): Promise<string>;
  copyIn(path: string, fromUri: string): Promise<void>;
  copyOut(path: string, toUri: string): Promise<void>;
  remove(path: string): Promise<void>;
  list(folder: string): Promise<string[]>;
}

// Optional so the app (and tests) still load where the native module isn't built in.
export default requireOptionalNativeModule<ICloudDriveModule>('ICloudDrive');
