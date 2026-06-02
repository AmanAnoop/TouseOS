self.addEventListener("push", (event) => {
  let data = { title: "TouseOS", body: "You have a new notification", url: "/notifications" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* use defaults */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      badge: "/favicon.ico",
      data: { url: data.url ?? "/notifications" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/notifications";
  event.waitUntil(clients.openWindow(url));
});
