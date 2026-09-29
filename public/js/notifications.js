import { db } from './firebase-init.js';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
// To use Firebase Messaging for push notifications, you would normally import getMessaging, getToken here.
// Omitting full FCM setup logic for brevity, focusing on in-app notifications.

// Request push notification permission
export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('This browser does not support desktop notification');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
}

// Get FCM token (Placeholder for actual FCM implementation)
export async function getFcmToken() {
    // Requires firebase messaging setup and VAPID key
    // return await getToken(messaging, { vapidKey: '...' });
    return null;
}

// Save FCM token to user profile
export async function saveFcmToken(userId, token) {
    if (!token) return;
    try {
        await updateDoc(doc(db, 'users', userId), {
            fcmToken: token
        });
    } catch (error) {
        console.error('Error saving FCM token:', error);
    }
}

// Subscribe to in-app notifications
export function subscribeToNotifications(userId, callback) {
    const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const notifications = [];
        snapshot.forEach((doc) => {
            notifications.push({ id: doc.id, ...doc.data() });
        });
        callback(notifications);
    });
}

// Mark notification as read
export async function markNotificationRead(notificationId) {
    try {
        await updateDoc(doc(db, 'notifications', notificationId), {
            read: true
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// Show toast notification
export function showToast(message, type = 'info', duration = 3000) {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    
    // Set colors based on type
    let bgColor = '#3b82f6'; // info
    if (type === 'success') bgColor = '#10b981';
    if (type === 'error') bgColor = '#ef4444';
    if (type === 'warning') bgColor = '#f59e0b';

    toast.style.cssText = `background: ${bgColor}; color: white; padding: 12px 20px; border-radius: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); font-size: 0.9rem; transform: translateY(100%); opacity: 0; transition: all 0.3s ease;`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    }, 10);

    // Animate out and remove
    setTimeout(() => {
        toast.style.transform = 'translateY(100%)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Show notification dropdown (assuming a UI container exists)
export function renderNotificationDropdown(notifications, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    
    if (notifications.length === 0) {
        container.innerHTML = '<div style="padding: 15px; text-align: center; color: #9ca3af;">No notifications</div>';
        return;
    }

    notifications.slice(0, 10).forEach(notif => {
        const item = document.createElement('div');
        item.style.cssText = `padding: 10px; border-bottom: 1px solid #374151; cursor: pointer; background: ${notif.read ? 'transparent' : 'rgba(0, 212, 170, 0.1)'};`;
        
        item.innerHTML = `
            <div style="font-weight: bold; font-size: 0.9rem; color: #fff; margin-bottom: 3px;">${notif.title}</div>
            <div style="font-size: 0.8rem; color: #d1d5db;">${notif.body}</div>
        `;

        item.addEventListener('click', () => {
            if (!notif.read) markNotificationRead(notif.id);
            // Handle navigation if needed based on notif.type or notif.referenceId
        });

        container.appendChild(item);
    });
}

// Get unread count
export function getUnreadCount(notifications) {
    return notifications.filter(n => !n.read).length;
}
