/**
 * Web Push Subscription Helper for TheraVox AI
 */

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.info('[WebPush] Service Worker registered successfully', reg.scope);
      return reg;
    } catch (e) {
      console.warn('[WebPush] Service Worker registration failed', e);
    }
  }
  return null;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return await Notification.requestPermission();
}
