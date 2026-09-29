import { loadWalletBalance, subscribeToWallet, loadEarningsSummary, loadSocialProof } from './wallet.js';

// Assume userId is retrieved from auth state
const USER_ID = 'test-user-id'; 

async function initDashboard() {
    // Start skeleton state is already in HTML
    
    // Subscribe to wallet for realtime updates
    subscribeToWallet(USER_ID, (wallet) => {
        const balEl = document.getElementById('dash-balance');
        if (balEl) balEl.textContent = `KES ${wallet.availableBalance.toFixed(2)}`;
        const pendEl = document.getElementById('dash-pending');
        if (pendEl) pendEl.textContent = `Pending: KES ${wallet.pendingBalance.toFixed(2)}`;
    });

    // Load earnings summary
    const summary = await loadEarningsSummary(USER_ID);
    const earnToday = document.getElementById('dash-earn-today');
    if (earnToday) earnToday.textContent = `KES ${summary.today.toFixed(2)}`;
    const earnWeek = document.getElementById('dash-earn-week');
    if (earnWeek) earnWeek.textContent = `KES ${summary.week.toFixed(2)}`;
    const earnLife = document.getElementById('dash-earn-lifetime');
    if (earnLife) earnLife.textContent = `KES ${summary.lifetime.toFixed(2)}`;
    const earnPend = document.getElementById('dash-earn-pending');
    if (earnPend) earnPend.textContent = `KES ${summary.pending.toFixed(2)}`;

    // Populate Opportunities (Mocked for UI demo, normally from Firestore config)
    const opps = [
        { title: 'Microtasks', reward: 'Up to KES 500', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>', link: 'tasks.html?type=MICROTASK' },
        { title: 'Surveys', reward: 'Up to KES 200', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>', link: 'tasks.html?type=SURVEY' },
        { title: 'Hotel Reviews', reward: 'Up to KES 1000', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M9 8h1"/><path d="M9 12h1"/><path d="M9 16h1"/><path d="M14 8h1"/><path d="M14 12h1"/><path d="M14 16h1"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></svg>', link: 'tasks.html?type=HOTEL_REVIEW' },
        { title: 'AI Training', reward: 'Up to KES 800', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/></svg>', link: 'tasks.html?type=AI_TRAINING' }
    ];
    
    const oppContainer = document.getElementById('opportunities-list');
    if (oppContainer) {
        oppContainer.innerHTML = ''; // clear skeletons
        opps.forEach(opp => {
            const el = document.createElement('a');
            el.className = 'opp-card';
            el.href = opp.link;
            el.innerHTML = `
                <div class="opp-icon">${opp.icon}</div>
                <div class="opp-title">${opp.title}</div>
                <div class="opp-reward">${opp.reward}</div>
            `;
            oppContainer.appendChild(el);
        });
    }

    // Load recent transactions (Stubbed here, real app uses loadTransactions)
    const txContainer = document.getElementById('recent-transactions');
    if (txContainer) {
        txContainer.innerHTML = '';
        // Mock data for UI
        const txs = [
            { desc: 'Task Reward', date: new Date().toLocaleDateString(), amount: 50, isOut: false, status: 'completed' },
            { desc: 'Withdrawal', date: new Date(Date.now()-86400000).toLocaleDateString(), amount: 500, isOut: true, status: 'pending' }
        ];
        
        if (txs.length === 0) {
            txContainer.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding: 20px;">No recent activity</div>';
        } else {
            txs.forEach(tx => {
                const el = document.createElement('div');
                el.className = 'tx-item';
                const iconCls = tx.isOut ? 'out' : 'in';
                const valCls = tx.isOut ? 'negative' : 'positive';
                const sign = tx.isOut ? '-' : '+';
                const iconSvg = tx.isOut
                    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>'
                    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="17" y1="7" x2="7" y2="17"/><polyline points="17 17 7 17 7 7"/></svg>';
                
                el.innerHTML = `
                    <div class="tx-icon ${iconCls}">${iconSvg}</div>
                    <div class="tx-details">
                        <div class="tx-title">${tx.desc}</div>
                        <div class="tx-date">${tx.date}</div>
                    </div>
                    <div class="tx-amount">
                        <div class="tx-value ${valCls}">${sign}KES ${tx.amount.toFixed(2)}</div>
                        <div class="tx-status ${tx.status}">${tx.status}</div>
                    </div>
                `;
                txContainer.appendChild(el);
            });
        }
    }

    // Social Proof cycle
    const proofs = await loadSocialProof();
    let proofIdx = 0;
    const toast = document.getElementById('social-proof-toast');
    const toastText = document.getElementById('social-proof-text');
    
    if (toast && toastText) {
        setInterval(() => {
            if(proofs.length === 0) return;
            const p = proofs[proofIdx];
            if (toastText) toastText.textContent = `User ${p.phone} just withdrew KES ${p.amount}`;
            if (toast) toast.classList.add('show');
            
            setTimeout(() => {
                if (toast) toast.classList.remove('show');
            }, 4000);
            proofIdx = (proofIdx + 1) % proofs.length;
        }, 15000); // Every 15 seconds for demo
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}
