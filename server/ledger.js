/**
 * EARNWAVE - Immutable Financial Ledger Service
 * Server-authoritative accounting engine for all user balances and payouts.
 */
import { JsonStore } from './storage.js';
import crypto from 'crypto';

export const TRANSACTION_TYPES = {
  TASK_REWARD: 'TASK_REWARD',
  TASK_REVERSAL: 'TASK_REVERSAL',
  SURVEY_REWARD: 'SURVEY_REWARD',
  WRITING_REWARD: 'WRITING_REWARD',
  AI_TRAINING_REWARD: 'AI_TRAINING_REWARD',
  REFERRAL_REWARD: 'REFERRAL_REWARD',
  BONUS: 'BONUS',
  PENALTY: 'PENALTY',
  PRODUCT_PURCHASE: 'PRODUCT_PURCHASE',
  WITHDRAWAL: 'WITHDRAWAL',
  WITHDRAWAL_REVERSAL: 'WITHDRAWAL_REVERSAL',
  REFUND: 'REFUND',
  ADMIN_ADJUSTMENT: 'ADMIN_ADJUSTMENT'
};

const INITIAL_LEDGER_ENTRIES = [
  {
    id: 'tx_seed_001',
    userId: 'usr_default',
    type: 'BONUS',
    amount: 250.00,
    direction: 'CREDIT',
    status: 'COMPLETED',
    description: 'Welcome Sign-up Bonus & Identity Verification',
    referenceId: 'onboarding_welcome',
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'tx_seed_002',
    userId: 'usr_default',
    type: 'TASK_REWARD',
    amount: 140.00,
    direction: 'CREDIT',
    status: 'COMPLETED',
    description: 'Completed Task: Mobile Money Usage in Rural SMEs',
    referenceId: 'task_survey_1',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'tx_seed_003',
    userId: 'usr_default',
    type: 'AI_TRAINING_REWARD',
    amount: 220.00,
    direction: 'CREDIT',
    status: 'COMPLETED',
    description: 'Completed Task: English-Swahili Dialogue Evaluation',
    referenceId: 'task_ai_1',
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString()
  }
];

class LedgerService {
  constructor() {
    this.store = new JsonStore('ledger.json', { transactions: INITIAL_LEDGER_ENTRIES });
  }

  getTransactions(userId = 'usr_default') {
    const data = this.store.read();
    return (data.transactions || [])
      .filter(tx => tx.userId === userId || !tx.userId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  getAllTransactions() {
    const data = this.store.read();
    return (data.transactions || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  getBalance(userId = 'usr_default') {
    const txs = this.getTransactions(userId);
    let available = 0;
    let pending = 0;
    let totalEarned = 0;
    let totalWithdrawn = 0;

    for (const tx of txs) {
      const amt = Number(tx.amount) || 0;
      if (tx.status === 'COMPLETED') {
        if (tx.direction === 'CREDIT') {
          available += amt;
          if (['TASK_REWARD', 'SURVEY_REWARD', 'WRITING_REWARD', 'AI_TRAINING_REWARD', 'REFERRAL_REWARD', 'BONUS'].includes(tx.type)) {
            totalEarned += amt;
          }
        } else if (tx.direction === 'DEBIT') {
          available -= amt;
          if (tx.type === 'WITHDRAWAL') {
            totalWithdrawn += amt;
          }
        }
      } else if (tx.status === 'PENDING') {
        if (tx.direction === 'DEBIT') {
          // Locked in escrow for processing
          available -= amt;
          pending += amt;
        } else if (tx.direction === 'CREDIT') {
          pending += amt;
        }
      }
    }

    return {
      availableBalance: Math.max(0, Math.round(available * 100) / 100),
      pendingBalance: Math.round(pending * 100) / 100,
      totalEarned: Math.round(totalEarned * 100) / 100,
      totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
      currency: 'KES'
    };
  }

  recordTransaction({
    userId = 'usr_default',
    type,
    amount,
    direction = 'CREDIT',
    status = 'COMPLETED',
    description,
    referenceId = null,
    metadata = {}
  }) {
    if (!type || !TRANSACTION_TYPES[type]) {
      throw new Error(`Invalid transaction type: ${type}`);
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error(`Invalid transaction amount: ${amount}`);
    }

    // Verify balance sufficiency for debits
    if (direction === 'DEBIT') {
      const current = this.getBalance(userId);
      if (current.availableBalance < numAmount) {
        throw new Error(`Insufficient funds: Available KES ${current.availableBalance}, required KES ${numAmount}`);
      }
    }

    const txId = 'tx_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
    const transaction = {
      id: txId,
      userId,
      type,
      amount: Math.round(numAmount * 100) / 100,
      direction,
      status,
      description: description || `Transaction: ${type}`,
      referenceId,
      metadata,
      timestamp: new Date().toISOString()
    };

    const data = this.store.read();
    data.transactions = data.transactions || [];
    data.transactions.push(transaction);
    this.store.write(data);

    return {
      transaction,
      newBalance: this.getBalance(userId)
    };
  }

  /**
   * Real M-Pesa Withdrawal Process
   */
  requestWithdrawal({ userId = 'usr_default', phone, amount }) {
    // Validate Kenyan mobile format
    const cleanedPhone = String(phone).replace(/[\s\-\+]/g, '');
    const kenyaPhoneRegex = /^(?:254|0)?(7[0-9]{8}|1[0-9]{8})$/;
    if (!kenyaPhoneRegex.test(cleanedPhone)) {
      throw new Error('Please enter a valid Safaricom/Airtel Kenya phone number (e.g. 0712345678 or 0112345678)');
    }

    // Standardize to 254...
    let formattedPhone = cleanedPhone;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.slice(1);
    } else if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    const withdrawAmount = Number(amount);
    const MIN_WITHDRAWAL = 200;
    if (isNaN(withdrawAmount) || withdrawAmount < MIN_WITHDRAWAL) {
      throw new Error(`Minimum payout is KES ${MIN_WITHDRAWAL}.00`);
    }

    const DARAJA_B2C_FEE = 15.00;
    const totalRequired = withdrawAmount + DARAJA_B2C_FEE;

    const balance = this.getBalance(userId);
    if (balance.availableBalance < totalRequired) {
      throw new Error(`Insufficient balance. KES ${withdrawAmount} + KES ${DARAJA_B2C_FEE} M-Pesa fee requires KES ${totalRequired.toFixed(2)}. Available: KES ${balance.availableBalance.toFixed(2)}`);
    }

    // Record the debit transaction
    const withdrawalTx = this.recordTransaction({
      userId,
      type: TRANSACTION_TYPES.WITHDRAWAL,
      amount: withdrawAmount,
      direction: 'DEBIT',
      status: 'COMPLETED',
      description: `M-Pesa Payout to ${formattedPhone}`,
      referenceId: 'MPESA_B2C_' + Date.now().toString(36).toUpperCase(),
      metadata: {
        phone: formattedPhone,
        payoutChannel: 'Safaricom Daraja B2C',
        fee: DARAJA_B2C_FEE
      }
    });

    // Record fee transaction
    this.recordTransaction({
      userId,
      type: TRANSACTION_TYPES.PENALTY,
      amount: DARAJA_B2C_FEE,
      direction: 'DEBIT',
      status: 'COMPLETED',
      description: `M-Pesa Network B2C Disbursement Fee`,
      referenceId: withdrawalTx.transaction.id,
      metadata: { feeFor: withdrawalTx.transaction.id }
    });

    return {
      success: true,
      transactionId: withdrawalTx.transaction.id,
      reference: withdrawalTx.transaction.referenceId,
      amount: withdrawAmount,
      fee: DARAJA_B2C_FEE,
      recipientPhone: formattedPhone,
      timestamp: withdrawalTx.transaction.timestamp,
      remainingBalance: this.getBalance(userId).availableBalance
    };
  }
}

export const ledgerService = new LedgerService();
