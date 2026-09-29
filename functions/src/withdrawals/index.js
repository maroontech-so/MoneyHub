const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// 1. requestWithdrawal (callable)
exports.requestWithdrawal = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
    }
    
    const userId = context.auth.uid;
    const { amount, phone } = data;
    
    if (!amount || amount <= 0 || !phone) {
        throw new functions.https.HttpsError('invalid-argument', 'Amount and phone are required.');
    }

    // Load system settings
    const settingsDoc = await db.collection('systemSettings').doc('withdrawals').get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {
        enabled: true,
        minimumAmount: 100,
        maximumAmount: 100000,
        dailyLimit: 300000,
        feeType: 'flat',
        feeValue: 20
    };

    if (!settings.enabled) {
        throw new functions.https.HttpsError('failed-precondition', 'Withdrawals are currently disabled.');
    }
    if (amount < settings.minimumAmount) {
        throw new functions.https.HttpsError('invalid-argument', `Minimum withdrawal is KES ${settings.minimumAmount}`);
    }
    if (amount > settings.maximumAmount) {
        throw new functions.https.HttpsError('invalid-argument', `Maximum withdrawal is KES ${settings.maximumAmount}`);
    }

    // Calculate fee
    let fee = 0;
    if (settings.feeType === 'percentage') {
        fee = amount * (settings.feeValue / 100);
    } else {
        fee = settings.feeValue;
    }
    const netAmount = amount - fee;

    return await db.runTransaction(async (transaction) => {
        const userRef = db.collection('users').doc(userId);
        const walletRef = db.collection('wallets').doc(userId);
        
        const userDoc = await transaction.get(userRef);
        const walletDoc = await transaction.get(walletRef);
        
        if (!userDoc.exists || userDoc.data().status === 'SUSPENDED' || userDoc.data().status === 'BANNED') {
            throw new functions.https.HttpsError('permission-denied', 'Account is inactive or banned.');
        }

        const currentBalance = walletDoc.exists ? walletDoc.data().availableBalance || 0 : 0;
        
        if (currentBalance < amount) {
            throw new functions.https.HttpsError('failed-precondition', 'Insufficient balance.');
        }

        // Daily limit check
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dailyQuery = await db.collection('withdrawals')
            .where('userId', '==', userId)
            .where('createdAt', '>=', today)
            .where('status', 'in', ['REQUESTED', 'PROCESSING', 'SUBMITTED', 'COMPLETED'])
            .get();
            
        let dailyTotal = 0;
        dailyQuery.forEach(doc => {
            dailyTotal += doc.data().amount;
        });

        if (dailyTotal + amount > settings.dailyLimit) {
            throw new functions.https.HttpsError('failed-precondition', `Daily withdrawal limit of KES ${settings.dailyLimit} exceeded.`);
        }

        // Deduct balance
        transaction.update(walletRef, {
            availableBalance: admin.firestore.FieldValue.increment(-amount),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Create withdrawal
        const withdrawalRef = db.collection('withdrawals').doc();
        transaction.set(withdrawalRef, {
            userId,
            amount,
            fee,
            netAmount,
            phone,
            status: 'REQUESTED',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Create wallet transaction
        const wtRef = db.collection('walletTransactions').doc();
        transaction.set(wtRef, {
            userId,
            type: 'WITHDRAWAL',
            direction: 'OUT',
            amount,
            fee,
            netAmount,
            status: 'PENDING',
            referenceId: withdrawalRef.id,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            withdrawalId: withdrawalRef.id,
            amount,
            fee,
            netAmount,
            message: 'Withdrawal requested successfully.'
        };
    });
});

// 2. processWithdrawal (internal/admin-callable)
exports.processWithdrawal = functions.https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
    }

    const { withdrawalId } = data;
    const withdrawalRef = db.collection('withdrawals').doc(withdrawalId);

    return await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(withdrawalRef);
        if (!doc.exists) {
            throw new functions.https.HttpsError('not-found', 'Withdrawal not found.');
        }

        const wData = doc.data();
        if (wData.status !== 'REQUESTED') {
            throw new functions.https.HttpsError('failed-precondition', 'Withdrawal is not in REQUESTED state.');
        }

        transaction.update(withdrawalRef, {
            status: 'PROCESSING',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // MOCK B2C CALL (In a real app, call Safaricom Daraja API here)
        const b2cConversationId = `B2C_${new Date().getTime()}_${Math.floor(Math.random()*1000)}`;
        
        transaction.update(withdrawalRef, {
            status: 'SUBMITTED',
            b2cConversationId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, b2cConversationId };
    });
});

// 3. handleWithdrawalCallback (HTTP)
exports.handleWithdrawalCallback = functions.https.onRequest(async (req, res) => {
    try {
        const payload = req.body;
        // Basic Daraja B2C payload parsing (mock structure)
        const result = payload.Result || {};
        const conversationId = result.ConversationID;
        const resultCode = result.ResultCode;
        const transactionId = result.TransactionID || 'N/A';
        
        if (!conversationId) {
            return res.status(400).send('Missing ConversationID');
        }

        const query = await db.collection('withdrawals').where('b2cConversationId', '==', conversationId).limit(1).get();
        if (query.empty) {
            return res.status(404).send('Withdrawal not found');
        }

        const withdrawalDoc = query.docs[0];
        const wData = withdrawalDoc.data();
        const withdrawalRef = withdrawalDoc.ref;

        if (wData.status === 'COMPLETED' || wData.status === 'FAILED' || wData.status === 'REVERSED') {
            return res.status(200).send('Already processed'); // Idempotency
        }

        await db.runTransaction(async (transaction) => {
            const wtQuery = await db.collection('walletTransactions').where('referenceId', '==', withdrawalRef.id).limit(1).get();
            const wtRef = wtQuery.empty ? null : wtQuery.docs[0].ref;

            if (resultCode === 0) { // Success
                transaction.update(withdrawalRef, {
                    status: 'COMPLETED',
                    providerReference: transactionId,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                if (wtRef) transaction.update(wtRef, { status: 'COMPLETED' });
                
                // Update lifetime withdrawn
                const walletRef = db.collection('wallets').doc(wData.userId);
                transaction.update(walletRef, {
                    lifetimeWithdrawn: admin.firestore.FieldValue.increment(wData.amount)
                });
            } else { // Failed
                transaction.update(withdrawalRef, {
                    status: 'FAILED',
                    providerError: result.ResultDesc,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                
                if (wtRef) transaction.update(wtRef, { status: 'FAILED' });

                // REVERSE FUNDS
                const walletRef = db.collection('wallets').doc(wData.userId);
                transaction.update(walletRef, {
                    availableBalance: admin.firestore.FieldValue.increment(wData.amount)
                });

                const revRef = db.collection('walletTransactions').doc();
                transaction.set(revRef, {
                    userId: wData.userId,
                    type: 'WITHDRAWAL_REVERSAL',
                    direction: 'IN',
                    amount: wData.amount,
                    status: 'COMPLETED',
                    referenceId: withdrawalRef.id,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            
            // Audit log
            const auditRef = db.collection('auditLogs').doc();
            transaction.set(auditRef, {
                action: resultCode === 0 ? 'WITHDRAWAL_COMPLETED' : 'WITHDRAWAL_FAILED',
                withdrawalId: withdrawalRef.id,
                userId: wData.userId,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        // Notifications would go here...

        res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch (err) {
        console.error('Callback error', err);
        res.status(500).send('Internal Server Error');
    }
});

// 4. retryFailedWithdrawal (admin-callable)
exports.retryFailedWithdrawal = functions.https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
    }
    throw new functions.https.HttpsError('unimplemented', 'Users should request a new withdrawal after a failure.');
});

// 5. reverseWithdrawal (admin-callable)
exports.reverseWithdrawal = functions.https.onCall(async (data, context) => {
    if (!context.auth || (!context.auth.token.admin && !context.auth.token.financeAdmin)) {
        throw new functions.https.HttpsError('permission-denied', 'Finance Admin access required.');
    }
    const { withdrawalId } = data;
    const withdrawalRef = db.collection('withdrawals').doc(withdrawalId);

    return await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(withdrawalRef);
        if (!doc.exists) throw new functions.https.HttpsError('not-found', 'Not found');
        const wData = doc.data();

        if (wData.status === 'COMPLETED' || wData.status === 'REVERSED') {
            throw new functions.https.HttpsError('failed-precondition', 'Cannot reverse in current state');
        }

        transaction.update(withdrawalRef, { status: 'REVERSED', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        const walletRef = db.collection('wallets').doc(wData.userId);
        transaction.update(walletRef, { availableBalance: admin.firestore.FieldValue.increment(wData.amount) });
        
        return { success: true };
    });
});
