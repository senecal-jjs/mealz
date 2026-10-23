import * as Notifications from 'expo-notifications';

// Show timer alerts as banners even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function canNotify(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/**
 * Schedules a "timer done" alert. Returns its id, or null when notifications
 * are off (the timer still runs on screen).
 */
export async function scheduleTimerAlert(
  title: string,
  body: string,
  seconds: number,
): Promise<string | null> {
  if (!(await canNotify())) return null;
  return Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.round(seconds)),
    },
  });
}

export async function cancelTimerAlert(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id);
}
