self.addEventListener("push", (event) => {
  let data = { title: "TouseOS", body: "You have a new notification" };
  try {
    if (event.data) data = event.data.json();
  } catch {
    /* use defaults */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/notifications";
  event.waitUntil(clients.openWindow(url));
});
