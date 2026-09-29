/**
 * EARNWAVE - State Store & Server API Bridge
 * Synchronizes client state with server-authoritative ledger, tasks, and admin services.
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
    this.syncWithServer();
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
        bio: 'Digital task specialist and fintech market researcher.',
        status: 'ACTIVE',
        role: 'USER',
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

    // 2. Initialize Default Fallback Wallet
    if (!this.get('wallet')) {
      this.set('wallet', {
        availableBalance: 610.00,
        pendingBalance: 0.00,
        totalEarned: 610.00,
        totalWithdrawn: 0.00,
        currency: 'KES'
      });
    }

    // 3. Initialize Notifications
    if (!this.get('notifications')) {
      this.set('notifications', [
        {
          id: 'notif_1',
          type: 'REWARD',
          title: 'KES 140 Credited',
          message: 'Server verified your submission for Mobile Money Habits.',
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

    // 4. Initialize Support Tickets
    if (!this.get('support_tickets')) {
      this.set('support_tickets', [
        {
          id: 'tkt_101',
          subject: 'Question on hotel audit guidelines',
          category: 'Tasks',
          status: 'RESOLVED',
          message: 'Can I perform hotel reviews if I am outside Nairobi county?',
          response: 'Yes! Our platform supports business reviews across all 47 counties in Kenya.',
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
        }
      ]);
    }
  }

  // --- Real Server Synchronization ---
  async syncWithServer() {
    try {
      const res = await fetch('/api/wallet/ledger');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.balance) {
            this.set('wallet', data.balance);
          }
          if (data.transactions) {
            this.set('transactions', data.transactions);
          }
        }
      }

      // Sync Admin Queue
      const adminRes = await fetch('/api/admin/submissions');
      if (adminRes.ok) {
        const adminData = await adminRes.json();
        if (adminData.success && adminData.submissions) {
          this.set('admin_submissions', adminData.submissions);
        }
      }
    } catch (e) {
      console.warn('Server sync deferred, using local cached store:', e.message);
    }
  }

  // --- Storage Primitive Helpers ---
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

  // --- Convenience Getters ---
  getUser() { return this.get('user'); }
  updateUser(updates) {
    const user = { ...this.getUser(), ...updates };
    this.set('user', user);
    return user;
  }

  getWallet() { return this.get('wallet') || { availableBalance: 0, pendingBalance: 0 }; }
  getTransactions() { return this.get('transactions') || []; }

  // --- Server-Authoritative M-Pesa Withdrawal ---
  async requestWithdrawal(phone, amount) {
    const res = await fetch('/api/wallet/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, amount: Number(amount) })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Withdrawal request rejected by server');
    }

    // Refresh ledger from server
    await this.syncWithServer();
    return data;
  }

  // --- Task Operations & Server Submissions ---
  async submitTaskWork(taskId, taskType, taskTitle, rewardKes, payload) {
    const res = await fetch(`/api/tasks/${taskId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskType, taskTitle, rewardKes, payload })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Server validation failed');
    }

    // Record completed task ID locally
    const completed = this.get('completed_tasks') || [];
    if (!completed.includes(taskId)) {
      completed.push(taskId);
      this.set('completed_tasks', completed);
    }

    // Refresh authoritative balance & ledger
    await this.syncWithServer();
    return data;
  }

  async autosaveTask(taskId, payload) {
    try {
      const res = await fetch(`/api/tasks/${taskId}/autosave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload })
      });
      return await res.json();
    } catch (e) {
      console.warn('Autosave network error:', e.message);
      return { success: false };
    }
  }

  async getTaskDraft(taskId) {
    try {
      const res = await fetch(`/api/tasks/${taskId}/draft`);
      if (res.ok) {
        const data = await res.json();
        return data.draft ? data.draft.payload : null;
      }
    } catch (e) {
      console.warn('Get draft error:', e.message);
    }
    return null;
  }

  // --- Admin Review Operations ---
  async reviewSubmission(submissionId, action, reviewerNotes = '') {
    const res = await fetch(`/api/admin/submissions/${submissionId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reviewerNotes })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Review operation failed');
    }
    await this.syncWithServer();
    return data;
  }

  async createCustomTask(taskData) {
    const res = await fetch('/api/admin/tasks/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to create task');
    }
    return data.task;
  }

  // --- Client Collections Fallback ---
  getNotifications() { return this.get('notifications') || []; }
  getSupportTickets() { return this.get('support_tickets') || []; }
  
  createTicket(subject, category, message) {
    const tickets = this.getSupportTickets();
    const newTicket = {
      id: 'tkt_' + Date.now().toString(36),
      subject,
      category,
      message,
      status: 'OPEN',
      response: 'Ticket received. A support specialist will respond within 4 hours.',
      createdAt: new Date().toISOString()
    };
    tickets.unshift(newTicket);
    this.set('support_tickets', tickets);
    return newTicket;
  }

  buyProduct(product) {
    const wallet = this.getWallet();
    if (wallet.availableBalance < product.price) {
      return { success: false, message: 'Insufficient wallet balance.' };
    }

    const inventory = this.get('my_products') || [];
    if (inventory.some(p => p.id === product.id)) {
      return { success: false, message: 'You already own this digital product.' };
    }

    // Debit wallet locally while syncing
    wallet.availableBalance -= product.price;
    this.set('wallet', wallet);

    inventory.push({ ...product, purchasedAt: new Date().toISOString() });
    this.set('my_products', inventory);

    return { success: true, message: `Purchased "${product.title}"!` };
  }

  getCompletedTasks() {
    return this.get('completed_tasks') || [];
  }
}

export const store = new StateStore();
