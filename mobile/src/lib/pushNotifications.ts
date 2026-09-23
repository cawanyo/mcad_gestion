import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Foreground behavior: without this handler, a push that arrives while the
// app is open is received but never shown — expo-notifications requires an
// explicit opt-in per notification.
//
// Guarded: this runs at module load time (App.tsx imports this file), so an
// unguarded throw here would crash the whole app on startup — which is
// exactly what happens if this JS ships via `eas update` (OTA) to a binary
// built before expo-notifications/expo-device were added as native
// dependencies (the native module isn't linked in that binary). Until every
// installed build has been rebuilt with `eas build`, this file must degrade
// to "no push" rather than take the app down.
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false
    })
  });
} catch {
  // Native module not present in this binary — push just won't work.
}

// Physical-device + permission dance required before a token can be
// obtained, mirrored from Expo's own push notifications guide. Simulators/
// emulators have no push capability, and a binary without the native
// module linked (see guard above) also resolves to null here instead of
// throwing.
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT
      });
    }

    if (!Device.isDevice) return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    return token;
  } catch {
    return null;
  }
}
