const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const crypto = require('crypto');

const db = getFirestore();
const auth = getAuth();

function generateReferralCode() {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
}

exports.onUserCreate = onCall(async (request) => {
    // We're converting to Callable if trigger isn't strictly requested,
    // wait, instructions say "Auth trigger"
    // Auth triggers in v2 are different, but we can use auth blocking or just firestore trigger.
    // Let's assume standard auth trigger is needed, but we don't have it natively in v2 easily without Identity Platform, 
    // let's use a standard callable or implement via auth trigger if we can.
    // Actually, we'll export it as a callable for simplicity, or we can use the v1 auth trigger.
    // Let's implement it as a standard callable that gets called after signup for safety, or just standard Firebase function.
});

// Since the prompt explicitly says: "Fires when new Firebase Auth user is created"
// We'll use firebase-functions/v1 for the auth trigger as it's standard.
const functionsV1 = require('firebase-functions');

exports.onUserCreate = functionsV1.auth.user().onCreate(async (user) => {
    const uid = user.uid;
    const email = user.email;
    const refCode = generateReferralCode();

    const settingsDoc = await db.collection('systemSettings').doc('activation').get();
    const activationEnabled = settingsDoc.exists ? settingsDoc.data().enabled : false;
    const status = activationEnabled ? 'PENDING_ACTIVATION' : 'ACTIVE';

    const batch = db.batch();

    const userRef = db.collection('users').doc(uid);
    batch.set(userRef, {
        email,
        referralCode: refCode,
        status,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    const walletRef = db.collection('wallets').doc(uid);
    batch.set(walletRef, {
        availableBalance: 0,
        pendingBalance: 0,
        lifetimeEarned: 0,
        updatedAt: new Date()
    });

    await batch.commit();
});

exports.checkUsername = onCall(async (request) => {
    const { username } = request.data;
    if (!username) throw new HttpsError('invalid-argument', 'Username required');

    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('username', '==', username).limit(1).get();

    return { available: snapshot.empty };
});

exports.setAdminClaim = onCall(async (request) => {
    if (!request.auth || !request.auth.token.admin) {
        throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { targetUid, role } = request.data;
    if (!targetUid || !role) throw new HttpsError('invalid-argument', 'Missing parameters');

    const validRoles = ['admin', 'moderator', 'financeAdmin', 'contentManager'];
    if (!validRoles.includes(role)) {
        throw new HttpsError('invalid-argument', 'Invalid role');
    }

    const claims = {};
    claims[role] = true;

    await auth.setCustomUserClaims(targetUid, claims);

    await db.collection('auditLogs').add({
        type: 'ADMIN_CLAIM_SET',
        adminId: request.auth.uid,
        targetUid,
        role,
        createdAt: new Date()
    });

    return { success: true };
});

// Helper for internal use
exports.activateUserAccount = async (transaction, userId) => {
    const userRef = db.collection('users').doc(userId);
    transaction.update(userRef, {
        status: 'ACTIVE',
        updatedAt: new Date()
    });
};
