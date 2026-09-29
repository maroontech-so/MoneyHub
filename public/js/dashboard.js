import { loadWalletBalance, subscribeToWallet, loadEarningsSummary, loadSocialProof } from './wallet.js';

// Assume userId is retrieved from auth state
const USER_ID = 'test-user-id'; 

async function initDashboard() {
    // Start skeleton state is already in HTML
    
    // Subscribe to wallet for realtime updates
    subscribeToWallet(USER_ID, (wallet) => {
        document.getElementById('dash-balance').textContent = `KES ${wallet.availableBalance.toFixed(2)}`;
        document.getElementById('dash-pending').textContent = `Pending: KES ${wallet.pendingBalance.toFixed(2)}`;
    });

    // Load earnings summary
    const summary = await loadEarningsSummary(USER_ID);
    document.getElementById('dash-earn-today').textContent = `KES ${summary.today.toFixed(2)}`;
    document.getElementById('dash-earn-week').textContent = `KES ${summary.week.toFixed(2)}`;
    document.getElementById('dash-earn-lifetime').textContent = `KES ${summary.lifetime.toFixed(2)}`;
    document.getElementById('dash-earn-pending').textContent = `KES ${summary.pending.toFixed(2)}`;

    // Populate Opportunities (Mocked for UI demo, normally from Firestore config)
    const opps = [
        { title: 'Microtasks', reward: 'Up to KES 500', icon: '📝', link: 'tasks.html?type=MICROTASK' },
        { title: 'Surveys', reward: 'Up to KES 200', icon: '📊', link: 'tasks.html?type=SURVEY' },
        { title: 'Hotel Reviews', reward: 'Up to KES 1000', icon: '🏨', link: 'tasks.html?type=HOTEL_REVIEW' },
        { title: 'AI Training', reward: 'Up to KES 800', icon: '🤖', link: 'tasks.html?type=AI_TRAINING' }
    ];
    
    const oppContainer = document.getElementById('opportunities-list');
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

    // Load recent transactions (Stubbed here, real app uses loadTransactions)
    const txContainer = document.getElementById('recent-transactions');
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
            
            el.innerHTML = `
                <div class="tx-icon ${iconCls}">${tx.isOut ? '💸' : '💰'}</div>
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

    // Social Proof cycle
    const proofs = await loadSocialProof();
    let proofIdx = 0;
    const toast = document.getElementById('social-proof-toast');
    const toastText = document.getElementById('social-proof-text');
    
    setInterval(() => {
        if(proofs.length === 0) return;
        const p = proofs[proofIdx];
        toastText.textContent = `User ${p.phone} just withdrew KES ${p.amount}`;
        toast.classList.add('show');
        
        setTimeout(() => toast.classList.remove('show'), 4000);
        proofIdx = (proofIdx + 1) % proofs.length;
    }, 15000); // Every 15 seconds for demo
}

document.addEventListener('DOMContentLoaded', initDashboard);
