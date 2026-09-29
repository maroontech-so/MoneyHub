import { auth, db, functions } from './firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';

// Verify admin access
async function verifyAdminAccess(user) {
    if (!user) return false;
    const tokenResult = await user.getIdTokenResult();
    if (!tokenResult.claims.admin && !tokenResult.claims.financeAdmin) {
        window.location.href = '/dashboard.html';
        return false;
    }
    return true;
}

// Router for admin pages
onAuthStateChanged(auth, async (user) => {
    const isAdmin = await verifyAdminAccess(user);
    if (!isAdmin) return;

    const path = window.location.pathname;
    if (path.includes('index.html') || path.endsWith('/admin/')) {
        initDashboard();
    } else if (path.includes('withdrawals.html')) {
        initWithdrawalsPage();
    } else if (path.includes('users.html')) {
        initUsersPage();
    } else if (path.includes('settings.html')) {
        initSettingsPage();
    } else if (path.includes('reports.html')) {
        initReportsPage();
    } else if (path.includes('payments.html')) {
        initPaymentsPage();
    }
});

// --- Dashboard Logic ---
async function initDashboard() {
    try {
        const getStats = httpsCallable(functions, 'getAdminStats');
        const res = await getStats();
        const stats = res.data;

        document.getElementById('stat-users').innerText = stats.totalUsers;
        document.getElementById('stat-active-users').innerText = stats.activeUsers;
        document.getElementById('stat-registrations').innerText = stats.todayRegistrations;
        document.getElementById('stat-revenue').innerText = `KES ${stats.todayRevenue}`;
        document.getElementById('stat-rewards').innerText = `KES ${stats.todayRewards}`;
        document.getElementById('stat-withdrawals-vol').innerText = `KES ${stats.todayWithdrawals}`;
        document.getElementById('stat-pending-tasks').innerText = stats.pendingTasks;
        document.getElementById('stat-pending-withdrawals').innerText = stats.pendingWithdrawals;
        document.getElementById('stat-pending-reviews').innerText = stats.pendingReviews;
        document.getElementById('stat-failed-payments').innerText = stats.failedPayments;
    } catch (e) {
        console.error("Error loading dashboard stats", e);
    }
}

// --- Withdrawals Logic ---
async function initWithdrawalsPage() {
    const tbody = document.getElementById('admin-withdrawals-tbody');
    const filter = document.getElementById('wd-status-filter');
    
    async function loadWd() {
        tbody.innerHTML = '<tr><td colspan="9">Loading...</td></tr>';
        try {
            let qConstraints = [orderBy('createdAt', 'desc'), limit(50)];
            if (filter.value !== 'ALL') {
                qConstraints.push(where('status', '==', filter.value));
            }

            const q = query(collection(db, 'withdrawals'), ...qConstraints);
            const snap = await getDocs(q);
            
            tbody.innerHTML = '';
            snap.forEach(docSnap => {
                const data = docSnap.data();
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${data.createdAt ? data.createdAt.toDate().toLocaleString() : 'N/A'}</td>
                    <td>${data.userId.substring(0,8)}...</td>
                    <td>${data.phone}</td>
                    <td>KES ${data.amount}</td>
                    <td>KES ${data.fee}</td>
                    <td>KES ${data.netAmount}</td>
                    <td><span class="badge">${data.status}</span></td>
                    <td>-</td>
                    <td>
                        ${data.status === 'REQUESTED' ? `<button class="btn btn-sm btn-primary" onclick="window.processWd('${docSnap.id}')">Process</button>` : ''}
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (e) {
            console.error(e);
            tbody.innerHTML = '<tr><td colspan="9">Error loading data</td></tr>';
        }
    }
    
    filter.addEventListener('change', loadWd);
    loadWd();

    window.processWd = async (id) => {
        if (!confirm('Process this withdrawal?')) return;
        try {
            const fn = httpsCallable(functions, 'processWithdrawal');
            await fn({ withdrawalId: id });
            alert('Processed successfully');
            loadWd();
        } catch (e) {
            alert('Error: ' + e.message);
        }
    };
}

// --- Users Logic ---
async function initUsersPage() {
    const tbody = document.getElementById('admin-users-tbody');
    const drawer = document.getElementById('user-drawer');
    const closeBtn = document.getElementById('close-drawer');
    let currentUser = null;

    async function loadUsers() {
        tbody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
        try {
            const q = query(collection(db, 'users'), limit(50));
            const snap = await getDocs(q);
            tbody.innerHTML = '';
            snap.forEach(docSnap => {
                const data = docSnap.data();
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${data.username || 'N/A'}</td>
                    <td>${data.email || 'N/A'}</td>
                    <td>${data.createdAt ? data.createdAt.toDate().toLocaleDateString() : 'N/A'}</td>
                    <td><span class="badge badge-${(data.status||'active').toLowerCase()}">${data.status || 'ACTIVE'}</span></td>
                    <td>-</td>
                    <td><button class="btn btn-sm btn-secondary" onclick="window.viewUser('${docSnap.id}')">View</button></td>
                `;
                tbody.appendChild(tr);
            });
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="6">Error loading data</td></tr>';
        }
    }

    loadUsers();

    window.viewUser = async (id) => {
        currentUser = id;
        const uDoc = await getDoc(doc(db, 'users', id));
        if (uDoc.exists()) {
            const d = uDoc.data();
            document.getElementById('drawer-username').innerText = d.username || 'N/A';
            document.getElementById('drawer-email').innerText = d.email || 'N/A';
            document.getElementById('drawer-phone').innerText = d.phone || 'N/A';
            document.getElementById('drawer-status').innerText = d.status || 'ACTIVE';
            
            const wDoc = await getDoc(doc(db, 'wallets', id));
            document.getElementById('drawer-balance').innerText = wDoc.exists() ? `KES ${wDoc.data().availableBalance}` : 'KES 0';
            
            drawer.classList.remove('hidden');
        }
    };

    closeBtn.addEventListener('click', () => drawer.classList.add('hidden'));

    document.getElementById('btn-suspend').addEventListener('click', async () => {
        const reason = prompt('Reason for suspension?');
        if (!reason) return;
        try {
            const fn = httpsCallable(functions, 'suspendUser');
            await fn({ userId: currentUser, reason, action: 'SUSPEND' });
            alert('User suspended');
            loadUsers();
            drawer.classList.add('hidden');
        } catch (e) {
            alert('Error: ' + e.message);
        }
    });

    document.getElementById('btn-adjust').addEventListener('click', async () => {
        const amount = prompt('Amount to adjust (can be negative):');
        if (!amount) return;
        const reason = prompt('Reason for adjustment:');
        if (!reason) return;
        
        try {
            const fn = httpsCallable(functions, 'adminAdjustWallet');
            await fn({ userId: currentUser, amount: parseFloat(amount), reason });
            alert('Wallet adjusted');
            window.viewUser(currentUser);
        } catch (e) {
            alert('Error: ' + e.message);
        }
    });
}

// --- Settings Logic ---
async function initSettingsPage() {
    const btnSave = document.getElementById('btn-save-settings');
    
    // Load existing
    const wdDoc = await getDoc(doc(db, 'systemSettings', 'withdrawals'));
    if (wdDoc.exists()) {
        const d = wdDoc.data();
        document.getElementById('set-withdrawals-enabled').checked = d.enabled;
        document.getElementById('set-wd-min').value = d.minimumAmount;
        document.getElementById('set-wd-max').value = d.maximumAmount;
        document.getElementById('set-wd-daily').value = d.dailyLimit;
        document.getElementById('set-wd-fee-type').value = d.feeType;
        document.getElementById('set-wd-fee-value').value = d.feeValue;
    }

    btnSave.addEventListener('click', async () => {
        btnSave.disabled = true;
        btnSave.innerText = 'Saving...';
        
        const withdrawalsSettings = {
            enabled: document.getElementById('set-withdrawals-enabled').checked,
            minimumAmount: parseFloat(document.getElementById('set-wd-min').value),
            maximumAmount: parseFloat(document.getElementById('set-wd-max').value),
            dailyLimit: parseFloat(document.getElementById('set-wd-daily').value),
            feeType: document.getElementById('set-wd-fee-type').value,
            feeValue: parseFloat(document.getElementById('set-wd-fee-value').value)
        };

        try {
            const updateFn = httpsCallable(functions, 'updateSystemSettings');
            await updateFn({ category: 'withdrawals', settings: withdrawalsSettings });
            
            // Assume other categories are saved similarly here...
            
            const status = document.getElementById('settings-status');
            status.innerText = 'Settings saved successfully.';
            status.className = 'status-message success';
            status.classList.remove('hidden');
            setTimeout(() => status.classList.add('hidden'), 3000);
        } catch (e) {
            alert('Error saving settings: ' + e.message);
        } finally {
            btnSave.disabled = false;
            btnSave.innerText = 'Save All Settings';
        }
    });
}

// Stub for reports and payments
function initReportsPage() {}
function initPaymentsPage() {}
