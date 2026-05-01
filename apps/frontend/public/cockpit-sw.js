self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'cockpit:notify') return;
  if (!self.registration || !self.registration.showNotification) return;

  self.registration.showNotification(data.title || 'Rancho Cockpit', {
    body: data.body || '',
    tag: 'rancho-cockpit',
    renotify: true,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url.includes('/admin/pedidos'));
      if (existing) return existing.focus();
      return self.clients.openWindow('/admin/pedidos');
    })
  );
});
