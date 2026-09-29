const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// 1. updateSystemSettings (callable - admin only)
exports.updateSystemSettings = functions.https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
    }
    
    const { category, settings } = data;
    if (!category || !settings) {
        throw new functions.https.HttpsError('invalid-argument', 'Category and settings object required.');
    }

    const settingsRef = db.collection('systemSettings').doc(category);
    await settingsRef.set(settings, { merge: true });

    // Audit log
    await db.collection('auditLogs').add({
        action: 'SYSTEM_SETTING_CHANGED',
        category,
        adminId: context.auth.uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
});

// 2. adminAdjustWallet (callable - financeAdmin only)
exports.adminAdjustWallet = functions.https.onCall(async (data, context) => {
    if (!context.auth || (!context.auth.token.admin && !context.auth.token.financeAdmin)) {
        throw new functions.https.HttpsError('permission-denied', 'Finance Admin access required.');
    }

    const { userId, amount, reason } = data;
    if (!userId || !amount || !reason) {
        throw new functions.https.HttpsError('invalid-argument', 'userId, amount, and reason are required.');
    }

    return await db.runTransaction(async (transaction) => {
        const walletRef = db.collection('wallets').doc(userId);
        const walletDoc = await transaction.get(walletRef);
        
        const beforeBalance = walletDoc.exists ? walletDoc.data().availableBalance || 0 : 0;
        
        transaction.set(walletRef, {
            availableBalance: admin.firestore.FieldValue.increment(amount),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        const wtRef = db.collection('walletTransactions').doc();
        transaction.set(wtRef, {
            userId,
            type: 'ADMIN_ADJUSTMENT',
            direction: amount > 0 ? 'IN' : 'OUT',
            amount: Math.abs(amount),
            status: 'COMPLETED',
            reason,
            adminId: context.auth.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const auditRef = db.collection('auditLogs').doc();
        transaction.set(auditRef, {
            action: 'WALLET_ADJUSTED',
            userId,
            adminId: context.auth.uid,
            amount,
            reason,
            beforeBalance,
            afterBalance: beforeBalance + amount,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, newBalance: beforeBalance + amount };
    });
});

// 3. suspendUser (callable - admin/moderator)
exports.suspendUser = functions.https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
    }

    const { userId, reason, action } = data; // action: 'SUSPEND' or 'REACTIVATE'
    const status = action === 'SUSPEND' ? 'SUSPENDED' : 'ACTIVE';

    const userRef = db.collection('users').doc(userId);
    await userRef.update({ 
        status, 
        statusReason: reason,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('auditLogs').add({
        action: action === 'SUSPEND' ? 'USER_SUSPENDED' : 'USER_REACTIVATED',
        userId,
        adminId: context.auth.uid,
        reason,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, status };
});

// 4. getAdminStats (callable - admin)
exports.getAdminStats = functions.https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
    }

    // In a production app, use Firestore Aggregation Queries (count(), sum()) 
    // MOCKING the returned data format to fulfill frontend requirements:
    return {
        totalUsers: 1500,
        activeUsers: 1200,
        todayRegistrations: 45,
        todayRevenue: 25000,
        todayRewards: 5000,
        todayWithdrawals: 15000,
        pendingTasks: 34,
        pendingWithdrawals: 12,
        pendingReviews: 8,
        failedPayments: 3
    };
});
