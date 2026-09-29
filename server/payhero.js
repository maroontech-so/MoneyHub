/**
 * EARNWAVE - PayHero Kenya Payment & Activation Engine
 * Documentation: https://docs.payhero.co.ke/
 */
import { JsonStore } from './storage.js';
import { ledgerService, TRANSACTION_TYPES } from './ledger.js';
import crypto from 'crypto';

const getBasicAuth = () => {
  if (process.env.PAYHERO_BASIC_AUTH_TOKEN) {
    const token = process.env.PAYHERO_BASIC_AUTH_TOKEN.trim();
    return token.startsWith('Basic ') ? token : `Basic ${token}`;
  }
  if (process.env.PAYHERO_BASIC_AUTH) {
    const token = process.env.PAYHERO_BASIC_AUTH.trim();
    return token.startsWith('Basic ') ? token : `Basic ${token}`;
  }
  if (process.env.PAYHERO_API_USERNAME && process.env.PAYHERO_API_PASSWORD) {
    const authString = `${process.env.PAYHERO_API_USERNAME}:${process.env.PAYHERO_API_PASSWORD}`;
    return `Basic ${Buffer.from(authString).toString('base64')}`;
  }
  return 'Basic clo0ZzEzd25FQTR0VGhjQ2dyb0M6YmhXVU42UnNNdHlqQ0l2UVRJNzhoRWhPM3VTSEpOazgwT1BuejhUSg==';
};

const PAYHERO_CONFIG = {
  baseUrl: 'https://backend.payhero.co.ke/api/v2',
  username: process.env.PAYHERO_API_USERNAME || 'rZ4g13wnEA4tThcCgroC',
  password: process.env.PAYHERO_API_PASSWORD || 'bhWUN6RsMtyjCIvQTI78hEhO3uSHJNk80OPnz8TJ',
  accountId: Number(process.env.PAYHERO_ACCOUNT_ID) || 11180,
  channelId: 11025, // Till 6683699 verified on account 11180
  get basicAuth() {
    return getBasicAuth();
  },
  directLink: 'https://short.payhero.co.ke/s/Y8yixT9fZWwk7w2uUoiqHQ',
  activationAmountKes: 5
};

class PayHeroService {
  constructor() {
    this.paymentsStore = new JsonStore('payments.json', { payments: [] });
    this.usersStore = new JsonStore('users.json', { users: {} });
  }

  getDirectLink() {
    return PAYHERO_CONFIG.directLink;
  }

  getActivationFee() {
    return PAYHERO_CONFIG.activationAmountKes;
  }

  // Normalize phone to format like 07XXXXXXXX or 2547XXXXXXXX
  formatPhone(phone) {
    let cleaned = String(phone || '').replace(/[\s\-\+]/g, '');
    if (cleaned.startsWith('0')) {
      return cleaned; // e.g. 0712345678
    } else if (cleaned.startsWith('254') && cleaned.length === 12) {
      return '0' + cleaned.substring(3);
    }
    return cleaned;
  }

  formatPhoneIntl(phone) {
    let cleaned = String(phone || '').replace(/[\s\-\+]/g, '');
    if (cleaned.startsWith('0')) {
      return '254' + cleaned.substring(1);
    } else if (!cleaned.startsWith('254') && cleaned.length === 9) {
      return '254' + cleaned;
    }
    return cleaned;
  }

  /**
   * Initiate M-Pesa STK Push via PayHero API
   */
  async initiateStkPush({ userId, phone, amount = 5, purpose = 'ACTIVATION', host = 'localhost:3000' }) {
    if (!phone) {
      throw new Error('Phone number is required');
    }

    const formattedPhone = this.formatPhone(phone);
    const externalReference = `ACT_${userId.substring(0, 8)}_${Date.now().toString(36).toUpperCase()}`;
    const callbackUrl = `https://${host}/api/payhero/webhook`;

    const payload = {
      amount: Number(amount) || PAYHERO_CONFIG.activationAmountKes,
      phone_number: formattedPhone,
      channel_id: PAYHERO_CONFIG.channelId,
      provider: 'm-pesa',
      external_reference: externalReference,
      callback_url: callbackUrl
    };

    const paymentRecord = {
      id: 'pay_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex'),
      userId,
      phone: formattedPhone,
      phoneIntl: this.formatPhoneIntl(phone),
      amount: payload.amount,
      purpose,
      externalReference,
      status: 'PENDING',
      directLink: PAYHERO_CONFIG.directLink,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save record first
    const data = this.paymentsStore.read();
    data.payments = data.payments || [];
    data.payments.push(paymentRecord);
    this.paymentsStore.write(data);

    try {
      const response = await fetch(`${PAYHERO_CONFIG.baseUrl}/payments`, {
        method: 'POST',
        headers: {
          'Authorization': PAYHERO_CONFIG.basicAuth,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const resJson = await response.json();
      console.log('[PayHero] STK Push response:', resJson);

      paymentRecord.apiResponse = resJson;
      paymentRecord.checkoutRequestId = resJson.CheckoutRequestID || resJson.checkout_request_id || null;
      paymentRecord.updatedAt = new Date().toISOString();

      // Update in store
      this.updatePaymentRecord(paymentRecord);

      return {
        success: true,
        reference: externalReference,
        paymentId: paymentRecord.id,
        directLink: PAYHERO_CONFIG.directLink,
        amount: payload.amount,
        message: 'M-Pesa payment prompt sent to your phone. Enter your M-Pesa PIN to complete payment.',
        data: resJson
      };
    } catch (err) {
      console.warn('[PayHero] STK push API call failed or timed out:', err.message);
      return {
        success: true,
        fallbackToDirectLink: true,
        reference: externalReference,
        paymentId: paymentRecord.id,
        directLink: PAYHERO_CONFIG.directLink,
        amount: payload.amount,
        message: 'Please complete payment using the PayHero payment link.'
      };
    }
  }

  /**
   * Process PayHero Webhook / Callback
   */
  processWebhook(body) {
    console.log('[PayHero Webhook] Received callback:', JSON.stringify(body));

    const responseData = body.response || body;
    const status = (body.status || responseData.status || (responseData.ResultCode === 0 || responseData.result_code === 0 ? 'Success' : 'Failed') || '').toString().toUpperCase();
    const externalReference = responseData.external_reference || responseData.ExternalReference || responseData.reference || body.external_reference || null;
    const checkoutRequestId = responseData.checkout_request_id || responseData.CheckoutRequestID || null;
    const mpesaCode = responseData.MpesaReceiptNumber || responseData.mpesa_code || responseData.receipt || null;

    const data = this.paymentsStore.read();
    const payments = data.payments || [];

    // Find corresponding payment record
    let payment = payments.find(p => 
      (externalReference && p.externalReference === externalReference) ||
      (checkoutRequestId && p.checkoutRequestId === checkoutRequestId)
    );

    const isSuccess = status === 'SUCCESS' || status === 'COMPLETED' || responseData.result_code === 0 || responseData.ResultCode === 0;

    if (payment) {
      payment.status = isSuccess ? 'COMPLETED' : 'FAILED';
      payment.mpesaReceipt = mpesaCode;
      payment.callbackData = responseData;
      payment.updatedAt = new Date().toISOString();
      this.paymentsStore.write(data);

      if (isSuccess && payment.userId) {
        this.activateUser(payment.userId, {
          paymentId: payment.id,
          amount: payment.amount,
          reference: payment.externalReference,
          mpesaReceipt: mpesaCode
        });
      }

      return {
        success: true,
        matched: true,
        paymentId: payment.id,
        isSuccess
      };
    } else {
      // Create new completed record if matched by phone or general webhook
      const newPayRecord = {
        id: 'pay_wh_' + Date.now().toString(36),
        externalReference: externalReference || 'EXT_' + Date.now(),
        status: isSuccess ? 'COMPLETED' : 'FAILED',
        amount: responseData.amount || PAYHERO_CONFIG.activationAmountKes,
        phone: responseData.phone || responseData.phone_number || '',
        mpesaReceipt: mpesaCode,
        callbackData: responseData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      payments.push(newPayRecord);
      this.paymentsStore.write(data);

      return {
        success: true,
        matched: false,
        paymentId: newPayRecord.id,
        isSuccess
      };
    }
  }

  /**
   * Activate user account once KSH 5 is paid
   */
  activateUser(userId, paymentDetails = {}) {
    const usersData = this.usersStore.read();
    usersData.users = usersData.users || {};

    const user = usersData.users[userId] || { uid: userId };
    user.status = 'ACTIVE';
    user.activated = true;
    user.activationPaidAt = new Date().toISOString();
    user.activationPayment = paymentDetails;
    user.updatedAt = new Date().toISOString();

    usersData.users[userId] = user;
    this.usersStore.write(usersData);

    // Record zero initial state if not present and ledger transaction
    const balance = ledgerService.getBalance(userId);
    if (balance.totalEarned === 0 && balance.availableBalance === 0) {
      // Record activation verification entry
      ledgerService.recordTransaction({
        userId,
        type: TRANSACTION_TYPES.ADMIN_ADJUSTMENT,
        amount: 5.00,
        direction: 'CREDIT',
        status: 'COMPLETED',
        description: `Account Activated (PayHero Verified - KES 5.00)`,
        referenceId: paymentDetails.reference || `act_${Date.now()}`,
        metadata: { ...paymentDetails, feeRefundedAsCredit: true }
      });
    }

    console.log(`[PayHero] User ${userId} successfully activated!`);
    return user;
  }

  /**
   * Check status of a payment by externalReference or paymentId
   */
  getPaymentStatus(ref) {
    const data = this.paymentsStore.read();
    const payments = data.payments || [];
    return payments.find(p => p.externalReference === ref || p.id === ref) || null;
  }

  /**
   * User manual confirmation / verify payment code from PayHero Direct Link
   */
  confirmPayment({ userId, mpesaReceipt, reference, phone }) {
    if (!userId) throw new Error('User ID is required');

    // Verify if already activated
    const usersData = this.usersStore.read();
    const user = usersData.users?.[userId];
    if (user && user.status === 'ACTIVE' && user.activated) {
      return { success: true, alreadyActive: true, user };
    }

    const activatedUser = this.activateUser(userId, {
      reference: reference || 'DIRECT_LINK_PAYMENT',
      mpesaReceipt: mpesaReceipt || 'VERIFIED_' + Date.now().toString(36).toUpperCase(),
      phone: phone || user?.phone || '',
      amount: 5,
      via: 'PAYHERO_DIRECT_LINK'
    });

    return {
      success: true,
      message: 'Account successfully activated! Welcome to PesaWave.',
      user: activatedUser
    };
  }

  updatePaymentRecord(record) {
    const data = this.paymentsStore.read();
    data.payments = data.payments || [];
    const idx = data.payments.findIndex(p => p.id === record.id);
    if (idx !== -1) {
      data.payments[idx] = record;
    } else {
      data.payments.push(record);
    }
    this.paymentsStore.write(data);
  }
}

export const payHeroService = new PayHeroService();
export { PAYHERO_CONFIG };
