import { doc, getDoc, onSnapshot, collection, query, where, orderBy, limit, getDocs, startAfter } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { db } from './firebase-init.js';

export async function loadWalletBalance(userId) {
    try {
        const docRef = doc(db, 'wallets', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) return docSnap.data();
        return { availableBalance: 0, pendingBalance: 0, lifetimeEarned: 0, lifetimeWithdrawn: 0 };
    } catch (e) {
        console.error("Error loading wallet", e);
        return null;
    }
}

export function subscribeToWallet(userId, callback) {
    const docRef = doc(db, 'wallets', userId);
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data());
        } else {
            callback({ availableBalance: 0, pendingBalance: 0, lifetimeEarned: 0, lifetimeWithdrawn: 0 });
        }
    });
}

export async function loadTransactions(userId, options = {}) {
    const txRef = collection(db, 'walletTransactions');
    let q = query(txRef, where('userId', '==', userId));
    
    if (options.status) q = query(q, where('status', '==', options.status));
    if (options.type) q = query(q, where('type', '==', options.type));
    
    q = query(q, orderBy('createdAt', 'desc'));
    if (options.limit) q = query(q, limit(options.limit));
    if (options.startAfter) q = query(q, startAfter(options.startAfter));

    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({id: d.id, ...d.data()}));
}

export async function loadEarningsSummary(userId) {
    // Usually aggregated via Cloud Functions and stored in user stats
    // Simplified stub based on wallet
    const wallet = await loadWalletBalance(userId);
    return {
        today: 0, // Should pull from a daily stats collection
        week: 0,
        lifetime: wallet?.lifetimeEarned || 0,
        pending: wallet?.pendingBalance || 0
    };
}

export function formatTransaction(txData) {
    const isOut = ['WITHDRAWAL', 'PRODUCT_PURCHASE', 'TASK_UNLOCK_PAYMENT', 'PENALTY'].includes(txData.type);
    const amountStr = (isOut ? '-' : '+') + `KES ${txData.amount.toFixed(2)}`;
    return {
        ...txData,
        isOut,
        amountStr,
        formattedDate: new Date(txData.createdAt?.toMillis() || Date.now()).toLocaleDateString()
    };
}

export async function loadSocialProof() {
    // Stub: real app would query recent completed withdrawals with limit(10)
    return [
        { phone: '071***890', amount: 500 },
        { phone: '072***123', amount: 1500 },
        { phone: '079***456', amount: 250 }
    ];
}

export function getTransactionDisplay(type, direction) {
    const out = ['WITHDRAWAL', 'PRODUCT_PURCHASE', 'TASK_UNLOCK_PAYMENT', 'PENALTY'].includes(type);
    return {
        icon: out ? '💸' : '💰',
        colorClass: out ? 'out' : 'in'
    };
}
