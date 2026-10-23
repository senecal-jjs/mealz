import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export type PhotoSource = 'camera' | 'library';

/** Opens the camera or photo library and returns the picked image's temporary URI. */
export async function pickPhoto(
  source: PhotoSource,
  options: { crop?: boolean } = {},
): Promise<string | null> {
  const settings: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: options.crop ?? false,
    quality: 0.8,
  };
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Camera access is off',
        'To take a photo, allow camera access for Mealz in the Settings app.',
      );
      return null;
    }
  }
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(settings)
      : await ImagePicker.launchImageLibraryAsync(settings);
  return result.canceled ? null : (result.assets[0]?.uri ?? null);
}

/** Asks camera or library with the system action sheet, then picks. */
export function choosePhotoSource(
  title: string,
  onPick: (source: PhotoSource) => void,
  extra?: { label: string; onPress: () => void },
) {
  Alert.alert(title, undefined, [
    { text: 'Take Photo', onPress: () => onPick('camera') },
    { text: 'Choose from Library', onPress: () => onPick('library') },
    ...(extra
      ? [{ text: extra.label, style: 'destructive' as const, onPress: extra.onPress }]
      : []),
    { text: 'Cancel', style: 'cancel' },
  ]);
}
