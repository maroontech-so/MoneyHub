const functions = require('firebase-functions');
const admin = require('firebase-admin');

// ------------------------------------------
// referrals/index.js
// ------------------------------------------

exports.createReferral = functions.firestore.document('users/{userId}').onCreate(async (snap, context) => {
    const newUser = snap.data();
    const newUserId = context.params.userId;
    const referralCode = newUser.referredByCode;

    if (!referralCode) return null;

    const db = admin.firestore();
    
    try {
        // 1. Find referral code owner
        const codesSnap = await db.collection('referralCodes').where('code', '==', referralCode).limit(1).get();
        if (codesSnap.empty) {
            console.log(`Referral code ${referralCode} not found.`);
            return null;
        }

        const codeDoc = codesSnap.docs[0];
        const referrerId = codeDoc.data().userId;

        // 2. Validate: not self-referral
        if (referrerId === newUserId) {
            console.log(`Self-referral detected for user ${newUserId}`);
            return null;
        }

        // 3. Create referrals doc
        await db.collection('referrals').add({
            referrerId,
            referredId: newUserId,
            referralCode,
            status: 'PENDING',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 4. Update referralCodes stats
        await codeDoc.ref.update({
            registrationCount: admin.firestore.FieldValue.increment(1)
        });

    } catch (error) {
        console.error("Error creating referral:", error);
    }
    return null;
});

// Callable or triggered when a user completes a task or activates account
exports.processReferralReward = functions.https.onCall(async (data, context) => {
    // Admin only or internal secure trigger.
    // Assuming data contains referredId that just qualified.
    const { referredId } = data;
    if (!referredId) return null;

    const db = admin.firestore();
    
    // Find pending referral
    const refSnap = await db.collection('referrals')
        .where('referredId', '==', referredId)
        .where('status', '==', 'PENDING')
        .limit(1).get();
        
    if (refSnap.empty) return null;
    
    const referralDoc = refSnap.docs[0];
    const referral = referralDoc.data();
    
    // IDEMPOTENCY: double check status
    if (referral.status !== 'PENDING') return null;

    const settingsDoc = await db.collection('systemSettings').doc('general').get();
    let rewardAmount = 50; // default
    if (settingsDoc.exists && settingsDoc.data().referrals && settingsDoc.data().referrals.reward) {
        rewardAmount = settingsDoc.data().referrals.reward;
    }

    const batch = db.batch();

    // Update referral status
    batch.update(referralDoc.ref, {
        status: 'QUALIFIED',
        commissionAmount: rewardAmount,
        qualifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create commission record
    const commRef = db.collection('affiliateCommissions').doc();
    batch.set(commRef, {
        referralId: referralDoc.id,
        referrerId: referral.referrerId,
        referredId,
        amount: rewardAmount,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Credit referrer wallet
    const walletRef = db.collection('wallets').doc(referral.referrerId);
    batch.update(walletRef, {
        balance: admin.firestore.FieldValue.increment(rewardAmount),
        totalEarned: admin.firestore.FieldValue.increment(rewardAmount)
    });

    // Record transaction
    const txRef = db.collection('transactions').doc();
    batch.set(txRef, {
        userId: referral.referrerId,
        amount: rewardAmount,
        type: 'REFERRAL_COMMISSION',
        status: 'COMPLETED',
        referenceId: commRef.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create Notification
    const notifRef = db.collection('notifications').doc();
    batch.set(notifRef, {
        userId: referral.referrerId,
        title: 'Referral Qualified!',
        body: `You earned KES ${rewardAmount} from your referral.`,
        type: 'commission',
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();
    return { success: true };
});
