import { loadWalletBalance, subscribeToWallet } from './wallet.js';
import { getCurrentUser } from './auth.js';

function updateUI(wallet) {
  const balance = wallet?.availableBalance || 0;
  const pending = wallet?.pendingBalance || 0;
  const earned = wallet?.lifetimeEarned || 0;
  const withdrawn = wallet?.lifetimeWithdrawn || 0;

  const elBal = document.getElementById('wallet-balance');
  const elPend = document.getElementById('wallet-pending');
  const elEarned = document.getElementById('wallet-earned');
  const elWithdrawn = document.getElementById('wallet-withdrawn');

  if (elBal) elBal.textContent = `KES ${balance.toFixed(2)}`;
  if (elPend) elPend.textContent = `Pending: KES ${pending.toFixed(2)}`;
  if (elEarned) elEarned.textContent = `KES ${earned.toFixed(2)}`;
  if (elWithdrawn) elWithdrawn.textContent = `KES ${withdrawn.toFixed(2)}`;
}

async function init() {
  const user = getCurrentUser();
  const userId = user ? user.uid : 'demo-user-001';

  try {
    const wallet = await loadWalletBalance(userId);
    updateUI(wallet || { availableBalance: 1500, pendingBalance: 200, lifetimeEarned: 2500, lifetimeWithdrawn: 800 });
    subscribeToWallet(userId, (liveWallet) => {
      if (liveWallet) updateUI(liveWallet);
    });
  } catch (err) {
    console.warn('Fallback to demo wallet:', err);
    updateUI({ availableBalance: 1500, pendingBalance: 200, lifetimeEarned: 2500, lifetimeWithdrawn: 800 });
  }
}

document.addEventListener('DOMContentLoaded', init);
