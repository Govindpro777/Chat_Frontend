self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Web Push from the server: shown when the app is closed or in the background
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data?.text() };
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // The page shows its own in-app notification when it is visible and focused
        if (clients.some((c) => c.visibilityState === "visible" && c.focused)) {
          return;
        }
        return self.registration.showNotification(data.title || "New message", {
          body: data.body,
          tag: data.tag,
          renotify: true,
          icon: data.icon ? `${data.icon}` : "/icon-192.png",
          badge: "/icon-192.png",
          data: { url: data.url || "/chat" },
        });
      })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/chat";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.postMessage({ type: "open-chat", url: target });
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      })
  );
});
