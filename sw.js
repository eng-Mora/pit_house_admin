// sw.js — Service Worker for Pit House Admin PWA
const CACHE_NAME = 'pithouse-admin-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

// ── Push من سيرفر خارجي (مستقبلاً) ──
self.addEventListener('push', (e) => {
    let data = { title: 'PIT HOUSE', body: 'إشعار جديد' };
    try { data = e.data.json(); } catch (_) {
        try { data.body = e.data.text(); } catch (_) {}
    }
    e.waitUntil(
        self.registration.showNotification(data.title || 'PIT HOUSE', {
            body: data.body || '',
            icon: data.icon || 'https://pit-house.firebaseapp.com/favicon.ico',
            tag: data.tag || 'pithouse-notif',
            renotify: true,
            requireInteraction: true,
            dir: 'rtl',
            lang: 'ar',
            vibrate: [200, 100, 200],
            data: { url: data.url || '/pit_house_admin/admin_panel_v31.html' }
        })
    );
});

// ── Message من الصفحة → showNotification (يشتغل حتى لو الشاشة مقفلة) ──
self.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'SHOW_NOTIFICATION') {
        const { title, body, tag } = e.data;
        self.registration.showNotification(title || 'PIT HOUSE', {
            body: body || '',
            icon: 'https://pit-house.firebaseapp.com/favicon.ico',
            tag: tag || 'pithouse-notif',
            renotify: true,
            requireInteraction: true,
            dir: 'rtl',
            lang: 'ar',
            vibrate: [200, 100, 200],
            data: { url: '/pit_house_admin/admin_panel_v31.html' }
        });
    }
});

// ── Click على الإشعار → فتح التطبيق ──
self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    const targetUrl = (e.notification.data && e.notification.data.url)
        ? e.notification.data.url
        : '/pit_house_admin/admin_panel_v31.html';
    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
            for (const c of list) {
                if (c.url.includes('pit_house_admin') && 'focus' in c) return c.focus();
            }
            if (clients.openWindow) return clients.openWindow(targetUrl);
        })
    );
});
