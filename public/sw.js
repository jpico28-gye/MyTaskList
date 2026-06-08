self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Task Reminder', {
      body:  data.body  ?? 'You have a task due soon.',
      icon:  '/favicon.ico',
      badge: '/favicon.ico',
      tag:   data.tag  ?? 'reminder',
      data:  { url: '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow('/'))
})
