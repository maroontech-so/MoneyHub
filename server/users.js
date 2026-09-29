/**
 * EARNWAVE - User Management & Authorization Service
 */
import { JsonStore } from './storage.js';
import { ledgerService } from './ledger.js';

class UsersService {
  constructor() {
    this.store = new JsonStore('users.json', { users: {} });
  }

  getUser(uid) {
    if (!uid) return null;
    const data = this.store.read();
    return data.users?.[uid] || null;
  }

  getAllUsers() {
    const data = this.store.read();
    return Object.values(data.users || {});
  }

  registerOrSync({ uid, email, username, phone, displayName }) {
    if (!uid) throw new Error('User UID is required');
    const data = this.store.read();
    data.users = data.users || {};

    const existing = data.users[uid];
    if (existing) {
      existing.email = email || existing.email;
      existing.username = username || existing.username;
      existing.phone = phone || existing.phone;
      existing.displayName = displayName || existing.displayName;
      existing.updatedAt = new Date().toISOString();
      this.store.write(data);
      return existing;
    }

    // New User - starts at ZERO and PENDING_ACTIVATION
    const isSpecialAdmin = (email && (email.toLowerCase().includes('admin@pesawave.co.ke') || email.toLowerCase().includes('admin@earnwave.co.ke')));
    const newUser = {
      uid,
      email: email || '',
      username: username || (email ? email.split('@')[0] : 'user_' + uid.substring(0, 6)),
      phone: phone || '',
      displayName: displayName || username || 'Earner',
      status: isSpecialAdmin ? 'ACTIVE' : 'PENDING_ACTIVATION',
      activated: isSpecialAdmin ? true : false,
      role: isSpecialAdmin ? 'ADMIN' : 'USER',
      activationFee: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    data.users[uid] = newUser;
    this.store.write(data);
    return newUser;
  }

  getUserStatus(uid) {
    if (!uid) {
      return { authenticated: false };
    }
    const user = this.getUser(uid);
    const balance = ledgerService.getBalance(uid);

    if (!user) {
      return {
        authenticated: true,
        uid,
        status: 'PENDING_ACTIVATION',
        activated: false,
        balance
      };
    }

    return {
      authenticated: true,
      user,
      status: user.status || 'PENDING_ACTIVATION',
      activated: Boolean(user.activated),
      balance
    };
  }

  activateUser(uid) {
    const data = this.store.read();
    data.users = data.users || {};
    if (!data.users[uid]) {
      data.users[uid] = { uid, status: 'ACTIVE', activated: true, createdAt: new Date().toISOString() };
    } else {
      data.users[uid].status = 'ACTIVE';
      data.users[uid].activated = true;
      data.users[uid].activatedAt = new Date().toISOString();
    }
    this.store.write(data);
    return data.users[uid];
  }

  /**
   * Update user status with payment details (called after PayHero activation)
   * Ensures activation from payment system is synced to main user store
   */
  updateUserStatus(uid, newStatus, paymentDetails = {}) {
    if (!uid) throw new Error('User UID is required');
    const data = this.store.read();
    data.users = data.users || {};

    if (!data.users[uid]) {
      data.users[uid] = { uid };
    }

    const user = data.users[uid];
    user.status = newStatus;
    user.updatedAt = new Date().toISOString();

    // If activating, set activation fields
    if (newStatus === 'ACTIVE') {
      user.activated = true;
      user.activatedAt = paymentDetails.activatedAt || new Date().toISOString();
      if (paymentDetails.paymentId) user.activationPaymentId = paymentDetails.paymentId;
      if (paymentDetails.reference) user.activationReference = paymentDetails.reference;
      if (paymentDetails.mpesaReceipt) user.activationMpesaReceipt = paymentDetails.mpesaReceipt;
    }

    this.store.write(data);
    console.log(`[UsersService] User ${uid} status updated to ${newStatus}`);
    return user;
  }
}

export const usersService = new UsersService();
