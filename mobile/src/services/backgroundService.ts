import notifee, { AndroidImportance } from '@notifee/react-native';

const CHANNEL_ID = 'hero-monitoring';
const NOTIFICATION_ID = 'hero-foreground';

export async function createNotificationChannel() {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Hero 모니터링',
    description: '농업인 안전 모니터링 서비스 실행 중',
    importance: AndroidImportance.LOW,
  });
}

export async function startForegroundService() {
  await createNotificationChannel();

  await notifee.displayNotification({
    id: NOTIFICATION_ID,
    title: 'Hero 모니터링 중',
    body: '어르신의 안전을 지키고 있습니다',
    android: {
      channelId: CHANNEL_ID,
      asForegroundService: true,
      ongoing: true,
      smallIcon: 'ic_notification',
      pressAction: { id: 'default' },
    },
  });

  console.log('[ForegroundService] Started');
}

export async function updateNotification(body: string) {
  await notifee.displayNotification({
    id: NOTIFICATION_ID,
    title: 'Hero 모니터링 중',
    body,
    android: {
      channelId: CHANNEL_ID,
      asForegroundService: true,
      ongoing: true,
      smallIcon: 'ic_notification',
      pressAction: { id: 'default' },
    },
  });
}

export async function stopForegroundService() {
  await notifee.stopForegroundService();
  console.log('[ForegroundService] Stopped');
}
