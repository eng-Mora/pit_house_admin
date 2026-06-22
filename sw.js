// sw.js — Service Worker for Pit House Admin PWA
// يستمع لـ Firebase مباشرة — يبعت إشعارات حتى لو التطبيق مسكر

const DB_URL = 'https://pit-house-default-rtdb.firebaseio.com';
const ICON   = 'https://pit-house.firebaseapp.com/favicon.ico';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

// ── State ──
let lastOrderIds  = null; // null = أول تشغيل
let lastReturnIds = null;

async function checkOrders() {
    try {
        const res  = await fetch(`${DB_URL}/orders.json`);
        const data = await res.json();
        if (!data) return;

        const orders  = Object.entries(data).map(([id, o]) => ({ id, ...o }));

        const currentOrderIds  = new Set(orders.filter(o => o.status !== 'returned' && o.status !== 'cancelled').map(o => o.id));
        const currentReturnIds = new Set(orders.filter(o => o.returnRequested || o.status === 'return_requested').map(o => o.id));

        // أول مرة — نحفظ بس مش نبعت
        if (lastOrderIds === null) {
            lastOrderIds  = currentOrderIds;
            lastReturnIds = currentReturnIds;
            return;
        }

        // أوردرات جديدة
        const newOrders = [...currentOrderIds].filter(id => !lastOrderIds.has(id));
        if (newOrders.length > 0) {
            await self.registration.showNotification('🛎️ PIT HOUSE — أوردر جديد!', {
                body: `وصل ${newOrders.length} أوردر جديد، افتح الأدمن بانيل`,
                icon: ICON,
                tag: 'new-order',
                renotify: true,
                requireInteraction: true,
                dir: 'rtl',
                lang: 'ar',
                vibrate: [200, 100, 200],
                data: { url: self.registration.scope }
            });
        }

        // طلبات إيرجاع جديدة
        const newReturns = [...currentReturnIds].filter(id => !lastReturnIds.has(id));
        if (newReturns.length > 0) {
            await self.registration.showNotification('↩️ PIT HOUSE — طلب إيرجاع!', {
                body: `في ${newReturns.length} عميل طلب إيرجاع، راجع الطلبات`,
                icon: ICON,
                tag: 'return-req',
                renotify: true,
                requireInteraction: true,
                dir: 'rtl',
                lang: 'ar',
                vibrate: [200, 100, 200],
                data: { url: self.registration.scope }
            });
        }

        lastOrderIds  = currentOrderIds;
        lastReturnIds = currentReturnIds;
    } catch (e) { /* network error — ignore */ }
}

// ── Periodic Sync (Android Chrome) ──
self.addEventListener('periodicsync', (e) => {
    if (e.tag === 'check-orders') e.waitUntil(checkOrders());
});

// ── Message من الصفحة ──
self.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'TICK') checkOrders();

    if (e.data && e.data.type === 'SHOW_NOTIFICATION') {
        const { title, body, tag } = e.data;
        self.registration.showNotification(title || 'PIT HOUSE', {
            body: body || '',
            icon: ICON,
            tag: tag || 'pithouse-notif',
            renotify: true,
            requireInteraction: true,
            dir: 'rtl',
            lang: 'ar',
            vibrate: [200, 100, 200],
            data: { url: self.registration.scope }
        });
    }
});

// ── Push من سيرفر (مستقبلاً) ──
self.addEventListener('push', (e) => {
    let data = { title: 'PIT HOUSE', body: 'إشعار جديد' };
    try { data = e.data.json(); } catch (_) {}
    e.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: ICON,
            tag: data.tag || 'pithouse-notif',
            renotify: true,
            requireInteraction: true,
            dir: 'rtl',
            lang: 'ar',
            vibrate: [200, 100, 200]
        })
    );
});

// ── Click على الإشعار ──
self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
            for (const c of list) {
                if (c.url.includes('pit_house_admin') && 'focus' in c) return c.focus();
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});
