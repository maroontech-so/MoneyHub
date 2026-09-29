const functions = require('firebase-functions');
const admin = require('firebase-admin');

// ------------------------------------------
// notifications/index.js
// ------------------------------------------

exports.sendNotification = async function(userId, notification) {
    const db = admin.firestore();
    
    // 1. Create in-app notification
    const notifRef = db.collection('notifications').doc();
    await notifRef.set({
        userId,
        title: notification.title,
        body: notification.body,
        type: notification.type || 'info',
        referenceId: notification.referenceId || null,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. Send FCM push if token exists
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData.fcmToken && userData.settings?.pushEnabled !== false) {
                const message = {
                    notification: {
                        title: notification.title,
                        body: notification.body
                    },
                    token: userData.fcmToken
                };
                
                await admin.messaging().send(message);
            }
        }
    } catch (error) {
        console.error('Error sending FCM notification:', error);
        // Clean up invalid tokens if necessary
        if (error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
            await db.collection('users').doc(userId).update({
                fcmToken: admin.firestore.FieldValue.delete()
            });
        }
    }
};

exports.markAllRead = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    const userId = context.auth.uid;
    const db = admin.firestore();
    
    const unreadSnap = await db.collection('notifications')
        .where('userId', '==', userId)
        .where('read', '==', false)
        .get();

    const batch = db.batch();
    unreadSnap.docs.forEach(doc => {
        batch.update(doc.ref, { read: true });
    });

    if (!unreadSnap.empty) {
        await batch.commit();
    }
    
    return { success: true };
});
