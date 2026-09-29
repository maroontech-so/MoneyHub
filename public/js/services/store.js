/**
 * EARNWAVE - State Store & Database Bridge
 * Handles user session, wallet ledger, tasks lifecycle, and Firestore synchronization.
 */
import { CATALOG } from '../data/tasks-catalog.js';
import { DIGITAL_PRODUCTS } from '../data/products-catalog.js';
import { AI_CHARACTERS } from '../data/characters-catalog.js';
import { LEVELS, ACHIEVEMENTS, INITIAL_LEADERBOARD } from '../data/gamification-data.js';
import { KNOWLEDGE_BASE } from '../data/knowledge-base.js';

class StateStore {
  constructor() {
    this.STORAGE_PREFIX = 'earnwave_prod_';
    this.memoryStore = new Map();
    this.listeners = new Set();
    this.init();
  }

  init() {
    // 1. Initialize User if not exists
    if (!this.get('user')) {
      const defaultUser = {
        uid: 'user_' + Math.random().toString(36).substring(2, 9),
        username: 'EarnWavePioneer',
        email: 'pioneer@earnwave.co.ke',
        phone: '254712345678',
        displayName: 'Pioneer Member',
        country: 'Kenya',
        county: 'Nairobi',
        city: 'Westlands',
        bio: 'Digital task enthusiast and fintech researcher.',
        status: 'ACTIVE',
        role: 'USER', // 'USER' or 'SUPER_ADMIN'
        level: 2,
        xp: 650,
        streakDays: 3,
        lastStreakDate: new Date().toISOString().split('T')[0],
        referralCode: 'WAVE' + Math.floor(1000 + Math.random() * 9000),
        referredBy: null,
        joinedAt: new Date(Date.now() - 5 * 86400000).toISOString()
      };
      this.set('user', defaultUser);
    }

    // 2. Initialize Wallet if not exists
    if (!this.get('wallet')) {
      this.set('wallet', {
        availableBalance: 1250.00,
        pendingBalance: 320.00,
        reservedBalance: 0.00,
        lifetimeEarned: 2450.00,
        lifetimeWithdrawn: 880.00,
        currency: 'KES'
      });
    }

    // 3. Initialize Ledger Transactions
    if (!this.get('transactions')) {
      this.set('transactions', [
        {
          id: 'tx_init_1',
          type: 'TASK_REWARD',
          title: 'Task Approved: Mobile Money Habits in East Africa',
          amount: 140.00,
          direction: 'CREDIT',
          status: 'COMPLETED',
          timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
          reference: 'TSK-SRV-901'
        },
        {
          id: 'tx_init_2',
          type: 'WITHDRAWAL',
          title: 'M-Pesa Payout to 254712345678',
          amount: 880.00,
          direction: 'DEBIT',
          status: 'COMPLETED',
          timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
          reference: 'MPESA-QRT89218K'
        },
        {
          id: 'tx_init_3',
          type: 'SIGNUP_BONUS',
          title: 'Welcome Pioneer Bonus',
          amount: 100.00,
          direction: 'CREDIT',
          status: 'COMPLETED',
          timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
          reference: 'BONUS-WELCOME'
        }
      ]);
    }

    // 4. Initialize User Task Attempts & Submissions
    if (!this.get('user_tasks')) {
      this.set('user_tasks', {});
    }

    // 5. Initialize Digital Purchases
    if (!this.get('purchases')) {
      this.set('purchases', ['prod_1']); // User starts owning blueprint
    }

    // 6. Initialize Notifications
    if (!this.get('notifications')) {
      this.set('notifications', [
        {
          id: 'notif_1',
          type: 'REWARD',
          title: 'KES 140 Credited',
          message: 'Your submission for Mobile Money Habits was verified and approved.',
          timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
          read: false
        },
        {
          id: 'notif_2',
          type: 'STREAK',
          title: '3-Day Streak Reached',
          message: 'Keep going! Complete 1 task today to maintain your momentum.',
          timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
          read: true
        }
      ]);
    }

    // 7. Initialize Support Tickets
    if (!this.get('support_tickets')) {
      this.set('support_tickets', [
        {
          id: 'tkt_101',
          subject: 'Question on hotel unlock fees',
          category: 'Tasks',
          priority: 'NORMAL',
          status: 'RESOLVED',
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          messages: [
            { sender: 'user', text: 'How is the hotel review unlock fee refunded?', time: '3 days ago' },
            { sender: 'agent', text: 'Unlock fees are security deposits to avoid non-completion. When your review is approved, your full reward includes the unlock compensation.', time: '3 days ago' }
          ]
        }
      ]);
    }

    // 8. Initialize System Settings
    if (!this.get('system_settings')) {
      this.set('system_settings', {
        minWithdrawal: 100,
        maxWithdrawal: 50000,
        withdrawalFee: 20,
        referralReward: 100,
        maintenanceMode: false
      });
    }

    // 9. Initialize Admin Pending Submissions Queue
    if (!this.get('admin_submissions')) {
      this.set('admin_submissions', [
        {
          id: 'sub_demo_1',
          taskId: 'wri_91',
          taskTitle: 'E-Commerce Product Description for Electronics (Brief 1)',
          userId: 'user_kw9128',
          username: 'Wanjiku_KE',
          submittedAt: new Date(Date.now() - 1800000).toISOString(),
          reward: 280,
          submissionData: 'This sleek 65W GaN dual-port fast charger delivers rapid power to both MacBooks and smartphones simultaneously. Features advanced surge protection, compact foldable prongs, and smart temperature regulation to safeguard battery longevity.',
          status: 'PENDING_REVIEW'
        },
        {
          id: 'sub_demo_2',
          taskId: 'res_122',
          taskTitle: 'Validate Statistical Claims in Online News (Batch 2)',
          userId: 'user_ot3918',
          username: 'Otieno_FactCheck',
          submittedAt: new Date(Date.now() - 4500000).toISOString(),
          reward: 360,
          submissionData: 'Source 1: Central Bank of Kenya Monthly Bulletin (March 2026). Source 2: KNBS Economic Survey table 4.2. Found that inflation stood at 5.8%, verifying the quoted statistic accurately.',
          status: 'PENDING_REVIEW'
        }
      ]);
    }
  }

  get(key) {
    try {
      if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem(this.STORAGE_PREFIX + key);
        return val ? JSON.parse(val) : null;
      }
      return this.memoryStore.get(key) || null;
    } catch (e) {
      console.error('Storage get error for', key, e);
      return null;
    }
  }

  set(key, value) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.STORAGE_PREFIX + key, JSON.stringify(value));
      } else {
        this.memoryStore.set(key, value);
      }
      this.notify(key, value);
    } catch (e) {
      console.error('Storage set error for', key, e);
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(key, value) {
    this.listeners.forEach(cb => {
      try { cb(key, value); } catch (e) { console.error('Listener callback error', e); }
    });
  }

  // --- Convenience Helpers ---
  getUser() { return this.get('user'); }
  updateUser(updates) {
    const user = { ...this.getUser(), ...updates };
    this.set('user', user);
    return user;
  }

  getWallet() { return this.get('wallet'); }
  
  /**
   * Authoritative Atomic Ledger Adjustment
   */
  adjustWallet(amount, direction, type, title, reference = '') {
    const wallet = this.getWallet();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return false;

    if (direction === 'DEBIT') {
      if (wallet.availableBalance < numAmount) return false;
      wallet.availableBalance -= numAmount;
      if (type === 'WITHDRAWAL') {
        wallet.lifetimeWithdrawn += numAmount;
      }
    } else {
      wallet.availableBalance += numAmount;
      wallet.lifetimeEarned += numAmount;
    }

    this.set('wallet', wallet);

    // Append to transactions ledger
    const txs = this.get('transactions') || [];
    const newTx = {
      id: 'tx_' + Math.random().toString(36).substring(2, 9),
      type,
      title,
      amount: numAmount,
      direction,
      status: 'COMPLETED',
      timestamp: new Date().toISOString(),
      reference: reference || 'REF-' + Math.floor(100000 + Math.random() * 900000)
    };
    txs.unshift(newTx);
    this.set('transactions', txs);

    // Notify notification center
    if (direction === 'CREDIT') {
      this.addNotification('REWARD', `+KES ${numAmount.toFixed(2)} Credited`, title);
    }

    return true;
  }

  addNotification(type, title, message) {
    const notifs = this.get('notifications') || [];
    notifs.unshift({
      id: 'notif_' + Math.random().toString(36).substring(2, 9),
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false
    });
    this.set('notifications', notifs);
  }

  markAllNotificationsRead() {
    const notifs = (this.get('notifications') || []).map(n => ({ ...n, read: true }));
    this.set('notifications', notifs);
  }

  // Task Submissions Record
  submitTaskWork(taskId, submissionContent, taskObj) {
    const user = this.getUser();
    const userTasks = this.get('user_tasks') || {};

    // Record attempt
    userTasks[taskId] = {
      taskId,
      status: 'SUBMITTED',
      reward: taskObj.reward,
      title: taskObj.title,
      category: taskObj.category,
      submissionContent,
      submittedAt: new Date().toISOString()
    };
    this.set('user_tasks', userTasks);

    // Push into admin review queue
    const adminSubs = this.get('admin_submissions') || [];
    adminSubs.unshift({
      id: 'sub_' + Math.random().toString(36).substring(2, 9),
      taskId,
      taskTitle: taskObj.title,
      userId: user.uid,
      username: user.username,
      submittedAt: new Date().toISOString(),
      reward: taskObj.reward,
      submissionData: typeof submissionContent === 'object' ? JSON.stringify(submissionContent) : submissionContent,
      status: 'PENDING_REVIEW'
    });
    this.set('admin_submissions', adminSubs);

    // Award XP
    this.addXp(50);
  }

  addXp(amount) {
    const user = this.getUser();
    let xp = (user.xp || 0) + amount;
    let currentLevel = user.level || 1;

    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i].minXp) {
        currentLevel = LEVELS[i].level;
        break;
      }
    }

    this.updateUser({ xp, level: currentLevel });
  }
}

export const store = new StateStore();
