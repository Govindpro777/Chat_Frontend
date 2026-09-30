import apiClient from "@/lib/api-client";
import { HOST } from "@/lib/constants";
import { notificationsSupported } from "@/lib/notifications";

export const pushSupported = () =>
  notificationsSupported() &&
  "serviceWorker" in navigator &&
  "PushManager" in window;

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const getRegistration = async () => {
  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
};

// Subscribes this device (if needed) and saves the current mute settings on the server
export const syncPushSubscription = async (settings) => {
  if (!pushSupported() || Notification.permission !== "granted") return;
  try {
    const reg = await getRegistration();
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      const { data } = await apiClient.get(`${HOST}/api/push/public-key`);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
    }
    await apiClient.post("/api/push/subscribe", {
      subscription: subscription.toJSON(),
      settings,
    });
  } catch (error) {
    console.log("Push subscription failed", error);
  }
};

// Removes this device's subscription, e.g. on logout so it stops receiving alerts
export const removePushSubscription = async () => {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const subscription = await reg?.pushManager.getSubscription();
    if (!subscription) return;
    await apiClient.post("/api/push/unsubscribe", {
      endpoint: subscription.endpoint,
    });
    await subscription.unsubscribe();
  } catch (error) {
    console.log("Push unsubscribe failed", error);
  }
};
