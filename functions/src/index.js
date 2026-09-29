/**
 * EARNWAVE - Main Cloud Functions Entry Point
 * All exports consolidated here. Admin SDK initialized once.
 */

const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK once
admin.initializeApp();

// Set global function options
setGlobalOptions({
    region: 'us-central1', // Change to 'africa-south1' once available for your plan
    maxInstances: 10
});

// ─── AUTH ────────────────────────────────────────────────────────────────────
const auth = require('./auth');
exports.onUserCreate    = auth.onUserCreate;
exports.checkUsername   = auth.checkUsername;
exports.setAdminClaim   = auth.setAdminClaim;

// ─── PAYMENTS & M-PESA ───────────────────────────────────────────────────────
const payments = require('./payments');
exports.createStkPush          = payments.createStkPush;
exports.handleMpesaCallback    = payments.handleMpesaCallback;
exports.queryMpesaTransaction  = payments.queryMpesaTransaction;

// ─── WALLET ──────────────────────────────────────────────────────────────────
const wallet = require('./wallet');
exports.getWalletBalance = wallet.getWalletBalance;

// ─── TASKS ───────────────────────────────────────────────────────────────────
const tasks = require('./tasks');
exports.unlockTask  = tasks.unlockTask;
exports.submitTask  = tasks.submitTask;
exports.approveTask = tasks.approveTask;
exports.rejectTask  = tasks.rejectTask;

// ─── HOTELS ──────────────────────────────────────────────────────────────────
const hotels = require('./tasks/hotels');
exports.unlockHotelReview  = hotels.unlockHotelReview;
exports.submitHotelReview  = hotels.submitHotelReview;
exports.approveHotelReview = hotels.approveHotelReview;

// ─── SURVEYS ─────────────────────────────────────────────────────────────────
const surveys = require('./tasks/surveys');
exports.startSurvey  = surveys.startSurvey;
exports.submitSurvey = surveys.submitSurvey;

// ─── WRITING ─────────────────────────────────────────────────────────────────
const writing = require('./tasks/writing');
exports.submitWritingTask  = writing.submitWritingTask;
exports.approveWritingTask = writing.approveWritingTask;

// ─── AI TRAINING ─────────────────────────────────────────────────────────────
const aitraining = require('./tasks/aitraining');
exports.submitAiTraining = aitraining.submitAiTraining;

// ─── PRODUCTS ────────────────────────────────────────────────────────────────
const products = require('./products');
exports.purchaseProduct  = products.purchaseProduct;
exports.getProductAccess = products.getProductAccess;

// ─── WITHDRAWALS ─────────────────────────────────────────────────────────────
const withdrawals = require('./withdrawals');
exports.requestWithdrawal       = withdrawals.requestWithdrawal;
exports.processWithdrawal       = withdrawals.processWithdrawal;
exports.handleWithdrawalCallback = withdrawals.handleWithdrawalCallback;
exports.retryFailedWithdrawal   = withdrawals.retryFailedWithdrawal;
exports.reverseWithdrawal       = withdrawals.reverseWithdrawal;

// ─── CHAT ────────────────────────────────────────────────────────────────────
const chat = require('./chat');
exports.unlockCharacter    = chat.unlockCharacter;
exports.sendChatMessage    = chat.sendChatMessage;
exports.evaluateChatReward = chat.evaluateChatReward;

// ─── REFERRALS ───────────────────────────────────────────────────────────────
const referrals = require('./referrals');
exports.processReferralReward = referrals.processReferralReward;

// ─── LEADERBOARD ─────────────────────────────────────────────────────────────
const leaderboard = require('./leaderboard');
exports.updateLeaderboard = leaderboard.updateLeaderboard;

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
const notifications = require('./notifications');
exports.markAllNotificationsRead = notifications.markAllRead;

// ─── ADMIN ───────────────────────────────────────────────────────────────────
const adminFns = require('./admin');
exports.updateSystemSettings = adminFns.updateSystemSettings;
exports.adminAdjustWallet    = adminFns.adminAdjustWallet;
exports.suspendUser          = adminFns.suspendUser;
exports.getAdminStats        = adminFns.getAdminStats;
