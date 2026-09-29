const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const db = getFirestore();

async function creditWallet(userId, amount, type, description, referenceId, metadata = {}, transaction = null) {
    const walletRef = db.collection('wallets').doc(userId);
    const txRef = db.collection('walletTransactions').doc();

    const doCredit = async (t) => {
        const walletDoc = await t.get(walletRef);
        if (!walletDoc.exists) {
            t.set(walletRef, { availableBalance: 0, pendingBalance: 0, lifetimeEarned: 0, updatedAt: new Date() });
        }
        
        const updateData = { updatedAt: new Date() };
        if (type === 'PENDING') {
            updateData.pendingBalance = FieldValue.increment(amount);
        } else {
            updateData.availableBalance = FieldValue.increment(amount);
            updateData.lifetimeEarned = FieldValue.increment(amount);
        }

        t.update(walletRef, updateData);

        t.set(txRef, {
            userId,
            amount,
            type: 'CREDIT',
            category: type,
            description,
            referenceId,
            metadata,
            createdAt: new Date()
        });

        return txRef.id;
    };

    if (transaction) {
        return await doCredit(transaction);
    } else {
        return await db.runTransaction(doCredit);
    }
}

async function debitWallet(userId, amount, type, description, referenceId, metadata = {}, transaction = null) {
    const walletRef = db.collection('wallets').doc(userId);
    const txRef = db.collection('walletTransactions').doc();

    const doDebit = async (t) => {
        const walletDoc = await t.get(walletRef);
        if (!walletDoc.exists) {
            throw new Error('Wallet not found');
        }

        const data = walletDoc.data();
        if (data.availableBalance < amount) {
            throw new Error('Insufficient balance');
        }

        t.update(walletRef, {
            availableBalance: FieldValue.increment(-amount),
            updatedAt: new Date()
        });

        t.set(txRef, {
            userId,
            amount,
            type: 'DEBIT',
            category: type,
            description,
            referenceId,
            metadata,
            createdAt: new Date()
        });

        return txRef.id;
    };

    if (transaction) {
        return await doDebit(transaction);
    } else {
        return await db.runTransaction(doDebit);
    }
}

exports.getWalletBalance = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

    const walletDoc = await db.collection('wallets').doc(request.auth.uid).get();
    if (!walletDoc.exists) {
        return { availableBalance: 0, pendingBalance: 0, lifetimeEarned: 0 };
    }

    return walletDoc.data();
});

module.exports = {
    creditWallet,
    debitWallet,
    getWalletBalance: exports.getWalletBalance
};
