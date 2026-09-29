/**
 * EARNWAVE - Payments & M-Pesa Cloud Functions
 * STK Push, Callback handler, Transaction query
 */

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const mpesa = require('./mpesa');

const db = getFirestore();

/**
 * Normalize Kenyan phone number to 254XXXXXXXXX format
 */
function normalizePhone(phone) {
    let normalized = String(phone).replace(/[^0-9]/g, '');
    if (normalized.startsWith('0')) {
        normalized = '254' + normalized.slice(1);
    } else if (normalized.startsWith('254')) {
        // already correct
    } else if (normalized.length === 9) {
        normalized = '254' + normalized;
    }
    return normalized;
}

/**
 * Execute purpose-specific action after successful payment.
 * All actions are performed within the provided Firestore transaction.
 */
async function executePurposeAction(transaction, payment, paymentDocId) {
    const { purpose, userId, referenceId } = payment;

    if (purpose === 'PRODUCT_PURCHASE' && referenceId) {
        // Grant product access atomically
        const accessRef = db.collection('productAccess').doc(`${userId}_${referenceId}`);
        const purchaseRef = db.collection('productPurchases').doc();
        const accessDoc = await transaction.get(accessRef);
        if (!accessDoc.exists) {
            transaction.set(accessRef, {
                userId,
                productId: referenceId,
                paymentId: paymentDocId,
                grantedAt: new Date(),
                status: 'ACTIVE'
            });
            transaction.set(purchaseRef, {
                userId,
                productId: referenceId,
                paymentId: paymentDocId,
                purchasedAt: new Date()
            });
        }

    } else if (purpose === 'ACTIVATION') {
        // Activate user account
        const userRef = db.collection('users').doc(userId);
        transaction.update(userRef, {
            status: 'ACTIVE',
            activatedAt: new Date(),
            updatedAt: new Date()
        });

    } else if (purpose === 'TASK_UNLOCK' && referenceId) {
        // Unlock task attempt
        const attemptRef = db.collection('taskAttempts').doc(`${userId}_${referenceId}`);
        const attemptDoc = await transaction.get(attemptRef);
        if (!attemptDoc.exists) {
            transaction.set(attemptRef, {
                userId,
                taskId: referenceId,
                status: 'UNLOCKED',
                createdAt: new Date(),
                updatedAt: new Date()
            });
        } else {
            transaction.update(attemptRef, { status: 'UNLOCKED', updatedAt: new Date() });
        }

    } else if (purpose === 'CHAT_UNLOCK' && referenceId) {
        // Unlock chat character
        const unlockRef = db.collection('chatUnlocks').doc(`${userId}_${referenceId}`);
        const unlockDoc = await transaction.get(unlockRef);
        if (!unlockDoc.exists) {
            transaction.set(unlockRef, {
                userId,
                characterId: referenceId,
                unlockedAt: new Date(),
                feePaid: payment.amount
            });
        }

    } else if (purpose === 'HOTEL_UNLOCK' && referenceId) {
        // Unlock hotel review task
        const hotelTaskRef = db.collection('hotelTasks').doc(`${userId}_${referenceId}`);
        const hotelTaskDoc = await transaction.get(hotelTaskRef);
        if (!hotelTaskDoc.exists) {
            transaction.set(hotelTaskRef, {
                userId,
                hotelId: referenceId,
                status: 'UNLOCKED',
                createdAt: new Date()
            });
        }
    }
}

/**
 * createStkPush - Initiate M-Pesa STK Push payment
 * Called from frontend to start a payment
 */
exports.createStkPush = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be logged in to make a payment');
    }

    const { amount, phone, purpose, referenceId } = request.data;
    const userId = request.auth.uid;

    // Validate inputs
    if (!amount || typeof amount !== 'number' || amount <= 0) {
        throw new HttpsError('invalid-argument', 'Invalid amount');
    }
    if (!phone) {
        throw new HttpsError('invalid-argument', 'Phone number is required');
    }
    const validPurposes = ['ACTIVATION', 'TASK_UNLOCK', 'PRODUCT_PURCHASE', 'CHAT_UNLOCK', 'HOTEL_UNLOCK'];
    if (!validPurposes.includes(purpose)) {
        throw new HttpsError('invalid-argument', `Invalid payment purpose: ${purpose}`);
    }

    const normalizedPhone = normalizePhone(phone);

    // Validate phone format
    if (!/^254[0-9]{9}$/.test(normalizedPhone)) {
        throw new HttpsError('invalid-argument', 'Invalid Kenyan phone number');
    }

    // Create PENDING payment record
    const paymentRef = db.collection('payments').doc();
    await paymentRef.set({
        userId,
        amount,
        phone: normalizedPhone,
        purpose,
        referenceId: referenceId || null,
        status: 'PENDING',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
    });

    // Build callback URL dynamically
    const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
    const callbackUrl = process.env.MPESA_CALLBACK_URL ||
        `https://us-central1-${projectId}.cloudfunctions.net/handleMpesaCallback`;

    try {
        const stkResponse = await mpesa.initiateStkPush({
            phone: normalizedPhone,
            amount: Math.round(amount), // M-Pesa requires integer
            accountReference: purpose.substring(0, 12),
            description: `EARNWAVE ${purpose}`.substring(0, 13),
            callbackUrl
        });

        // Update payment with M-Pesa reference IDs
        await paymentRef.update({
            merchantRequestId: stkResponse.MerchantRequestID,
            checkoutRequestId: stkResponse.CheckoutRequestID,
            updatedAt: FieldValue.serverTimestamp()
        });

        return {
            paymentId: paymentRef.id,
            checkoutRequestId: stkResponse.CheckoutRequestID,
            message: 'Check your phone and enter your M-Pesa PIN to complete payment.'
        };

    } catch (error) {
        console.error('STK Push initiation failed:', error.message);
        await paymentRef.update({
            status: 'FAILED',
            resultDescription: 'Failed to initiate M-Pesa payment. Please try again.',
            updatedAt: FieldValue.serverTimestamp()
        });
        throw new HttpsError('internal', 'M-Pesa payment initiation failed. Please try again.');
    }
});

/**
 * handleMpesaCallback - Webhook called by Safaricom after payment
 * CRITICAL: Must always return 200 to Safaricom
 * CRITICAL: Must be idempotent - same callback processed only once
 */
exports.handleMpesaCallback = onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(200).send('OK'); // Always 200
    }

    const callbackData = req.body;

    if (!mpesa.validateCallback(callbackData)) {
        console.error('Invalid M-Pesa callback payload received:', JSON.stringify(callbackData));
        return res.status(200).send('OK'); // Always 200 even for invalid
    }

    const stkCallback = callbackData.Body.stkCallback;
    const checkoutRequestId = stkCallback.CheckoutRequestID;
    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;

    // Extract M-Pesa receipt number on success
    let mpesaReceiptNumber = null;
    let transactionDate = null;
    if (resultCode === 0 && stkCallback.CallbackMetadata) {
        const items = stkCallback.CallbackMetadata.Item || [];
        for (const item of items) {
            if (item.Name === 'MpesaReceiptNumber') mpesaReceiptNumber = item.Value;
            if (item.Name === 'TransactionDate') transactionDate = item.Value;
        }
    }

    const status = resultCode === 0 ? 'SUCCESS' : 'FAILED';

    try {
        await db.runTransaction(async (transaction) => {
            // Find payment by CheckoutRequestID
            const paymentsQuery = db.collection('payments')
                .where('checkoutRequestId', '==', checkoutRequestId)
                .limit(1);
            const paymentsSnapshot = await transaction.get(paymentsQuery);

            if (paymentsSnapshot.empty) {
                console.error(`No payment found for CheckoutRequestID: ${checkoutRequestId}`);
                return; // Exit transaction silently
            }

            const paymentDoc = paymentsSnapshot.docs[0];
            const payment = paymentDoc.data();

            // IDEMPOTENCY CHECK: Only process PENDING payments
            if (payment.status !== 'PENDING') {
                console.log(`Payment ${paymentDoc.id} already processed (status: ${payment.status}). Skipping.`);
                return;
            }

            // Update payment status
            transaction.update(paymentDoc.ref, {
                status,
                mpesaReceiptNumber,
                transactionDate,
                resultCode,
                resultDescription: resultDesc,
                updatedAt: new Date()
            });

            // Create audit log
            const auditRef = db.collection('auditLogs').doc();
            transaction.set(auditRef, {
                actorId: 'SYSTEM',
                actorRole: 'system',
                action: 'MPESA_CALLBACK_PROCESSED',
                entityType: 'payment',
                entityId: paymentDoc.id,
                metadata: { checkoutRequestId, resultCode, status },
                timestamp: new Date()
            });

            // Execute business action only on success
            if (status === 'SUCCESS') {
                await executePurposeAction(transaction, payment, paymentDoc.id);
            }
        });

    } catch (error) {
        // Log error but ALWAYS return 200 to Safaricom
        console.error('Error processing M-Pesa callback:', error);
    }

    // ALWAYS return 200 to Safaricom, otherwise they retry
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

/**
 * queryMpesaTransaction - Check payment status
 * Frontend polls this to know if payment completed
 */
exports.queryMpesaTransaction = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const { paymentId } = request.data;
    if (!paymentId) {
        throw new HttpsError('invalid-argument', 'Payment ID required');
    }

    const paymentDoc = await db.collection('payments').doc(paymentId).get();

    if (!paymentDoc.exists) {
        throw new HttpsError('not-found', 'Payment not found');
    }

    const payment = paymentDoc.data();

    // Security: only the payment owner can query it
    if (payment.userId !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Access denied');
    }

    // If still pending after 90 seconds, query Daraja for status
    if (payment.status === 'PENDING' && payment.checkoutRequestId) {
        const createdAt = payment.createdAt?.toDate?.() || new Date(payment.createdAt);
        const ageMs = Date.now() - createdAt.getTime();

        if (ageMs > 90000) {
            try {
                const stkStatus = await mpesa.queryStkStatus(payment.checkoutRequestId);
                const rc = parseInt(stkStatus.ResultCode, 10);

                let newStatus = 'PENDING';
                if (!isNaN(rc)) {
                    newStatus = rc === 0 ? 'SUCCESS' : 'FAILED';
                }

                if (newStatus !== 'PENDING') {
                    await paymentDoc.ref.update({
                        status: newStatus,
                        resultCode: rc,
                        resultDescription: stkStatus.ResultDesc || '',
                        updatedAt: new Date()
                    });
                    return {
                        status: newStatus,
                        resultDescription: stkStatus.ResultDesc || ''
                    };
                }
            } catch (err) {
                console.warn('STK status query failed:', err.message);
            }
        }
    }

    return {
        status: payment.status,
        resultDescription: payment.resultDescription || ''
    };
});
