const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { creditWallet } = require('../wallet');

const db = getFirestore();

// Helper for internal use in mpesa callback
async function unlockTaskInternal(transaction, userId, taskId) {
    const attemptRef = db.collection('taskAttempts').doc(`${userId}_${taskId}`);
    const attemptDoc = await transaction.get(attemptRef);
    if (!attemptDoc.exists) {
        transaction.set(attemptRef, {
            userId,
            taskId,
            status: 'UNLOCKED',
            createdAt: new Date(),
            updatedAt: new Date()
        });
    } else {
        transaction.update(attemptRef, {
            status: 'UNLOCKED',
            updatedAt: new Date()
        });
    }
}

exports.unlockTaskInternal = unlockTaskInternal;

exports.unlockTask = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

    const { taskId, phone } = request.data;
    const userId = request.auth.uid;

    const taskRef = db.collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) throw new HttpsError('not-found', 'Task not found');
    const task = taskDoc.data();

    if (task.status !== 'PUBLISHED' && task.status !== 'AVAILABLE') {
        throw new HttpsError('failed-precondition', 'Task not available');
    }

    const attemptRef = db.collection('taskAttempts').doc(`${userId}_${taskId}`);
    const attemptDoc = await attemptRef.get();

    if (attemptDoc.exists && attemptDoc.data().status !== 'FAILED') {
        throw new HttpsError('already-exists', 'Task already unlocked or in progress');
    }

    const unlockFee = task.unlockFee || 0;

    if (unlockFee > 0) {
        if (!phone) throw new HttpsError('invalid-argument', 'Phone number required for paid tasks');
        
        let normalizedPhone = phone.replace(/[^0-9]/g, '');
        if (normalizedPhone.startsWith('0')) normalizedPhone = '254' + normalizedPhone.slice(1);
        
        const paymentRef = db.collection('payments').doc();
        
        await paymentRef.set({
            userId,
            amount: unlockFee,
            phone: normalizedPhone,
            purpose: 'TASK_UNLOCK',
            referenceId: taskId,
            status: 'PENDING',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Use the HTTP endpoint URL
        const mpesa = require('../payments/mpesa');
        const callbackUrl = `https://${process.env.GCLOUD_PROJECT}.cloudfunctions.net/handleMpesaCallback`;

        try {
            const stkResponse = await mpesa.initiateStkPush({
                phone: normalizedPhone,
                amount: unlockFee,
                accountReference: 'TASK',
                description: `Unlock Task ${taskId.substring(0,4)}`,
                callbackUrl
            });

            await paymentRef.update({
                merchantRequestId: stkResponse.MerchantRequestID,
                checkoutRequestId: stkResponse.CheckoutRequestID,
                updatedAt: new Date()
            });

            return {
                paymentId: paymentRef.id,
                checkoutRequestId: stkResponse.CheckoutRequestID,
                requiresPayment: true
            };
        } catch (error) {
            await paymentRef.update({ status: 'FAILED' });
            throw new HttpsError('internal', 'Payment initiation failed');
        }
    } else {
        await attemptRef.set({
            userId,
            taskId,
            status: 'UNLOCKED',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        return { requiresPayment: false };
    }
});

exports.submitTask = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

    const { taskId, submissionData } = request.data;
    const userId = request.auth.uid;

    const attemptRef = db.collection('taskAttempts').doc(`${userId}_${taskId}`);
    const attemptDoc = await attemptRef.get();

    if (!attemptDoc.exists || !['UNLOCKED', 'STARTED'].includes(attemptDoc.data().status)) {
        throw new HttpsError('failed-precondition', 'Task not started or already submitted');
    }

    const taskRef = db.collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) throw new HttpsError('not-found', 'Task not found');

    const submissionRef = db.collection('taskSubmissions').doc();
    
    await db.runTransaction(async (t) => {
        t.set(submissionRef, {
            taskId,
            userId,
            attemptId: attemptDoc.id,
            data: submissionData,
            status: 'PENDING_REVIEW',
            createdAt: new Date()
        });

        t.update(attemptRef, {
            status: 'SUBMITTED',
            submissionId: submissionRef.id,
            updatedAt: new Date()
        });
    });

    return { submissionId: submissionRef.id };
});

exports.approveTask = onCall(async (request) => {
    if (!request.auth || (!request.auth.token.admin && !request.auth.token.moderator)) {
        throw new HttpsError('permission-denied', 'Admin or moderator access required');
    }

    const { submissionId, notes } = request.data;

    const submissionRef = db.collection('taskSubmissions').doc(submissionId);
    
    await db.runTransaction(async (t) => {
        const submissionDoc = await t.get(submissionRef);
        if (!submissionDoc.exists) throw new HttpsError('not-found', 'Submission not found');
        
        const submission = submissionDoc.data();
        if (submission.status !== 'PENDING_REVIEW') throw new HttpsError('failed-precondition', 'Submission not pending');

        const taskRef = db.collection('tasks').doc(submission.taskId);
        const taskDoc = await t.get(taskRef);
        const task = taskDoc.data();

        const attemptRef = db.collection('taskAttempts').doc(submission.attemptId);

        t.update(submissionRef, {
            status: 'APPROVED',
            reviewNotes: notes || '',
            reviewedBy: request.auth.uid,
            reviewedAt: new Date()
        });

        t.update(attemptRef, {
            status: 'APPROVED',
            updatedAt: new Date()
        });

        if (task.rewardAmount > 0) {
            // Need to pass transaction to creditWallet to maintain atomicity, 
            // but creditWallet is defined elsewhere. Assuming it can take a transaction.
            const walletRef = db.collection('wallets').doc(submission.userId);
            const walletDoc = await t.get(walletRef);
            if (!walletDoc.exists) {
                t.set(walletRef, { availableBalance: task.rewardAmount, pendingBalance: 0, lifetimeEarned: task.rewardAmount, updatedAt: new Date() });
            } else {
                t.update(walletRef, { 
                    availableBalance: FieldValue.increment(task.rewardAmount),
                    lifetimeEarned: FieldValue.increment(task.rewardAmount),
                    updatedAt: new Date()
                });
            }

            const txRef = db.collection('walletTransactions').doc();
            t.set(txRef, {
                userId: submission.userId,
                amount: task.rewardAmount,
                type: 'CREDIT',
                category: 'TASK_REWARD',
                description: `Reward for task ${task.title}`,
                referenceId: submissionId,
                createdAt: new Date()
            });
        }
        
        const auditRef = db.collection('auditLogs').doc();
        t.set(auditRef, {
            type: 'TASK_APPROVED',
            adminId: request.auth.uid,
            submissionId,
            userId: submission.userId,
            createdAt: new Date()
        });
    });

    return { success: true };
});

exports.rejectTask = onCall(async (request) => {
    if (!request.auth || (!request.auth.token.admin && !request.auth.token.moderator)) {
        throw new HttpsError('permission-denied', 'Admin or moderator access required');
    }

    const { submissionId, notes } = request.data;

    const submissionRef = db.collection('taskSubmissions').doc(submissionId);
    
    await db.runTransaction(async (t) => {
        const submissionDoc = await t.get(submissionRef);
        if (!submissionDoc.exists) throw new HttpsError('not-found', 'Submission not found');
        
        const submission = submissionDoc.data();
        if (submission.status !== 'PENDING_REVIEW') throw new HttpsError('failed-precondition', 'Submission not pending');

        const attemptRef = db.collection('taskAttempts').doc(submission.attemptId);

        t.update(submissionRef, {
            status: 'REJECTED',
            reviewNotes: notes || '',
            reviewedBy: request.auth.uid,
            reviewedAt: new Date()
        });

        t.update(attemptRef, {
            status: 'REJECTED',
            updatedAt: new Date()
        });
        
        const auditRef = db.collection('auditLogs').doc();
        t.set(auditRef, {
            type: 'TASK_REJECTED',
            adminId: request.auth.uid,
            submissionId,
            userId: submission.userId,
            createdAt: new Date()
        });
    });

    return { success: true };
});
