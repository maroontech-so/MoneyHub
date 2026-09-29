import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, query, where, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

const auth = getAuth();
const db = getFirestore();
const functions = getFunctions();

let withdrawalSettings = null;
let currentBalance = 0;
let dailyWithdrawn = 0;

// Load withdrawal settings from Firestore
async function loadWithdrawalSettings() {
    try {
        const docRef = doc(db, 'systemSettings', 'withdrawals');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            withdrawalSettings = docSnap.data();
        } else {
            // Defaults
            withdrawalSettings = { enabled: true, minimumAmount: 100, maximumAmount: 100000, dailyLimit: 300000, feeType: 'flat', feeValue: 20 };
        }
        return withdrawalSettings;
    } catch (error) {
        console.error("Error loading settings:", error);
        return null;
    }
}

// Calculate withdrawal fee
function calculateFee(amount, feeConfig) {
    if (!amount || amount <= 0) return 0;
    if (feeConfig.type === 'percentage') {
        return amount * (feeConfig.value / 100);
    }
    return feeConfig.value;
}

// Load daily withdrawal total for user
async function getDailyWithdrawalTotal(userId) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const q = query(
            collection(db, 'withdrawals'),
            where('userId', '==', userId),
            where('createdAt', '>=', today),
            where('status', 'in', ['REQUESTED', 'PROCESSING', 'SUBMITTED', 'COMPLETED'])
        );
        
        const snapshot = await getDocs(q);
        let total = 0;
        snapshot.forEach(doc => {
            total += doc.data().amount;
        });
        return total;
    } catch (error) {
        console.error("Error getting daily total:", error);
        return 0;
    }
}

// Real-time balance listener for withdraw page
function subscribeToBalance(userId, callback) {
    return onSnapshot(doc(db, 'wallets', userId), (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data());
        }
    });
}

// Submit withdrawal request (calls Cloud Function)
async function requestWithdrawal(amount, phone) {
    const fn = httpsCallable(functions, 'requestWithdrawal');
    return await fn({ amount, phone });
}

// Init withdraw page
async function initWithdrawPage(user) {
    const amountInput = document.getElementById('amount');
    const phoneInput = document.getElementById('phone');
    const displayAmount = document.getElementById('display-amount');
    const displayFee = document.getElementById('display-fee');
    const displayNet = document.getElementById('display-net');
    const btnWithdraw = document.getElementById('btn-withdraw');
    
    // Set default phone if available in profile
    const profileDoc = await getDoc(doc(db, 'users', user.uid));
    if (profileDoc.exists() && profileDoc.data().phone) {
        phoneInput.value = profileDoc.data().phone;
    }

    await loadWithdrawalSettings();
    document.getElementById('amount-hint').innerText = `Min: KES ${withdrawalSettings.minimumAmount} | Max: KES ${withdrawalSettings.maximumAmount}`;

    dailyWithdrawn = await getDailyWithdrawalTotal(user.uid);
    updateDailyLimitDisplay();

    subscribeToBalance(user.uid, (wallet) => {
        currentBalance = wallet.availableBalance || 0;
        document.getElementById('available-balance').innerText = `KES ${currentBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        // Optionally calculate pending from walletTransactions
        validateForm();
    });

    amountInput.addEventListener('input', () => {
        updateFeeDisplay();
        validateForm();
    });

    document.querySelectorAll('.btn-quick').forEach(btn => {
        btn.addEventListener('click', (e) => {
            amountInput.value = e.target.dataset.amount;
            updateFeeDisplay();
            validateForm();
        });
    });

    function updateFeeDisplay() {
        const amount = parseFloat(amountInput.value) || 0;
        displayAmount.innerText = `KES ${amount}`;
        const fee = calculateFee(amount, { type: withdrawalSettings.feeType, value: withdrawalSettings.feeValue });
        displayFee.innerText = `KES ${fee}`;
        displayNet.innerText = `KES ${amount - fee}`;
    }

    function updateDailyLimitDisplay() {
        const remaining = withdrawalSettings.dailyLimit - dailyWithdrawn;
        document.getElementById('daily-limit-info').innerText = `Daily limit: KES ${remaining} remaining`;
    }

    function validateForm() {
        const amount = parseFloat(amountInput.value) || 0;
        const remainingLimit = withdrawalSettings.dailyLimit - dailyWithdrawn;
        
        let isValid = true;
        if (!withdrawalSettings.enabled) isValid = false;
        if (amount < withdrawalSettings.minimumAmount) isValid = false;
        if (amount > withdrawalSettings.maximumAmount) isValid = false;
        if (amount > currentBalance) isValid = false;
        if (amount > remainingLimit) isValid = false;
        if (!phoneInput.value) isValid = false;

        btnWithdraw.disabled = !isValid;
    }

    // Modal logic
    const form = document.getElementById('withdraw-form');
    const modal = document.getElementById('confirm-modal');
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (btnWithdraw && btnWithdraw.disabled) return;
        
        const mAmount = document.getElementById('modal-amount');
        if (mAmount && amountInput) mAmount.innerText = `KES ${amountInput.value}`;
        const mPhone = document.getElementById('modal-phone');
        if (mPhone && phoneInput) mPhone.innerText = phoneInput.value;
        if (modal) modal.classList.remove('hidden');
    });

    document.getElementById('btn-cancel')?.addEventListener('click', () => {
        if (modal) modal.classList.add('hidden');
    });

    document.getElementById('btn-confirm')?.addEventListener('click', async () => {
        if (modal) modal.classList.add('hidden');
        if (btnWithdraw) {
            btnWithdraw.disabled = true;
            btnWithdraw.innerText = 'Processing...';
        }
        const msgDiv = document.getElementById('status-message');
        
        try {
            const amount = parseFloat(amountInput.value);
            const phone = phoneInput.value;
            await requestWithdrawal(amount, phone);
            
            if (msgDiv) {
                msgDiv.innerText = 'Your withdrawal is being processed. You will receive M-Pesa within minutes.';
                msgDiv.className = 'status-message success';
            }
            if (amountInput) amountInput.value = '';
            updateFeeDisplay();
            dailyWithdrawn += amount;
            updateDailyLimitDisplay();
        } catch (error) {
            if (msgDiv) {
                msgDiv.innerText = error.message || 'Error processing withdrawal.';
                msgDiv.className = 'status-message error';
            }
        } finally {
            if (msgDiv) msgDiv.classList.remove('hidden');
            validateForm();
            if (btnWithdraw) btnWithdraw.innerText = 'Withdraw';
        }
    });
}

// Payouts Page Logic
async function initPayoutsPage(user) {
    const tbody = document.getElementById('payout-tbody');
    const emptyState = document.getElementById('empty-state');
    const statusFilter = document.getElementById('status-filter');
    const dateFilter = document.getElementById('date-filter');

    // Subscribe to total withdrawn
    subscribeToBalance(user.uid, (wallet) => {
        const total = wallet.lifetimeWithdrawn || 0;
        const totEl = document.getElementById('total-withdrawn');
        if (totEl) totEl.innerText = `KES ${total.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    });

    async function loadWithdrawals() {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';
        try {
            let qConstraints = [
                where('userId', '==', user.uid),
                orderBy('createdAt', 'desc'),
                limit(50)
            ];

            if (statusFilter.value !== 'ALL') {
                qConstraints.push(where('status', '==', statusFilter.value));
            }

            if (dateFilter.value !== 'ALL') {
                const date = new Date();
                date.setDate(date.getDate() - parseInt(dateFilter.value));
                qConstraints.push(where('createdAt', '>=', date));
            }

            const q = query(collection(db, 'withdrawals'), ...qConstraints);
            const snapshot = await getDocs(q);
            
            tbody.innerHTML = '';
            if (snapshot.empty) {
                emptyState.classList.remove('hidden');
            } else {
                emptyState.classList.add('hidden');
                snapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    const dateStr = data.createdAt ? data.createdAt.toDate().toLocaleString() : 'N/A';
                    const phoneMask = data.phone ? data.phone.replace(/(\d{3})\d{6}(\d{3})/, "$1***$2") : '';
                    
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${dateStr}</td>
                        <td>KES ${data.amount}</td>
                        <td>KES ${data.fee}</td>
                        <td>KES ${data.netAmount}</td>
                        <td>${phoneMask}</td>
                        <td>${data.providerReference || '-'}</td>
                        <td><span class="badge badge-${data.status.toLowerCase()}">${data.status}</span></td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        } catch (error) {
            console.error("Error loading history:", error);
            tbody.innerHTML = '<tr><td colspan="7" class="text-center error">Failed to load history.</td></tr>';
        }
    }

    statusFilter.addEventListener('change', loadWithdrawals);
    dateFilter.addEventListener('change', loadWithdrawals);

    loadWithdrawals();
}

// Router
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = '/login.html';
        return;
    }
    
    if (window.location.pathname.includes('withdraw.html')) {
        initWithdrawPage(user);
    } else if (window.location.pathname.includes('payouts.html')) {
        initPayoutsPage(user);
    }
});
