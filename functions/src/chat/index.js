/**
 * EARNWAVE - Chat & Earn Cloud Functions
 * AI character unlock, message sending, reward evaluation
 * 
 * AI API key stays server-side at all times.
 * Characters are always clearly identified as AI.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const axios = require('axios');

const db = getFirestore();

/**
 * unlockCharacter - Unlock an AI chat character
 * Free characters: unlocked immediately
 * Paid characters: STK Push initiated, unlock happens in payment callback
 */
exports.unlockCharacter = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const userId = request.auth.uid;
    const { characterId, phone } = request.data;

    if (!characterId) {
        throw new HttpsError('invalid-argument', 'Character ID required');
    }

    const charRef = db.collection('chatCharacters').doc(characterId);
    const charDoc = await charRef.get();

    if (!charDoc.exists) {
        throw new HttpsError('not-found', 'Character not found');
    }

    const character = charDoc.data();

    if (character.status !== 'ACTIVE') {
        throw new HttpsError('failed-precondition', 'This character is not currently available');
    }

    // Check if already unlocked
    const unlockRef = db.collection('chatUnlocks').doc(`${userId}_${characterId}`);
    const unlockDoc = await unlockRef.get();

    if (unlockDoc.exists) {
        return { alreadyUnlocked: true };
    }

    const unlockFee = character.unlockFee || 0;

    if (unlockFee > 0) {
        // Paid unlock — initiate STK push, actual unlock happens in payment callback
        if (!phone) {
            throw new HttpsError('invalid-argument', 'Phone number required for paid character unlock');
        }

        const mpesa = require('../payments/mpesa');

        let normalizedPhone = String(phone).replace(/[^0-9]/g, '');
        if (normalizedPhone.startsWith('0')) normalizedPhone = '254' + normalizedPhone.slice(1);
        else if (normalizedPhone.length === 9) normalizedPhone = '254' + normalizedPhone;

        const paymentRef = db.collection('payments').doc();
        await paymentRef.set({
            userId,
            amount: unlockFee,
            phone: normalizedPhone,
            purpose: 'CHAT_UNLOCK',
            referenceId: characterId,
            status: 'PENDING',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });

        const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
        const callbackUrl = process.env.MPESA_CALLBACK_URL ||
            `https://us-central1-${projectId}.cloudfunctions.net/handleMpesaCallback`;

        try {
            const stkResponse = await mpesa.initiateStkPush({
                phone: normalizedPhone,
                amount: Math.round(unlockFee),
                accountReference: 'CHAT',
                description: 'Chat Unlock',
                callbackUrl
            });

            await paymentRef.update({
                merchantRequestId: stkResponse.MerchantRequestID,
                checkoutRequestId: stkResponse.CheckoutRequestID,
                updatedAt: FieldValue.serverTimestamp()
            });

            return {
                requiresPayment: true,
                paymentId: paymentRef.id,
                checkoutRequestId: stkResponse.CheckoutRequestID,
                message: 'Enter your M-Pesa PIN to unlock this character'
            };
        } catch (error) {
            await paymentRef.update({ status: 'FAILED', updatedAt: FieldValue.serverTimestamp() });
            throw new HttpsError('internal', 'Payment initiation failed. Please try again.');
        }

    } else {
        // Free unlock
        await unlockRef.set({
            userId,
            characterId,
            unlockedAt: FieldValue.serverTimestamp(),
            feePaid: 0
        });
        return { requiresPayment: false, unlocked: true };
    }
});

/**
 * sendChatMessage - Send a message to an AI character
 * Calls AI provider API server-side. Key never exposed to client.
 * Evaluates reward eligibility with anti-spam checks.
 */
exports.sendChatMessage = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const userId = request.auth.uid;
    const { characterId, content } = request.data;

    if (!characterId || !content || content.trim().length === 0) {
        throw new HttpsError('invalid-argument', 'Character ID and message content are required');
    }

    const trimmedContent = content.trim();

    // Load character
    const charDoc = await db.collection('chatCharacters').doc(characterId).get();
    if (!charDoc.exists) {
        throw new HttpsError('not-found', 'Character not found');
    }
    const character = charDoc.data();

    // Verify unlock (if character requires payment)
    const unlockFee = character.unlockFee || 0;
    if (unlockFee > 0) {
        const unlockDoc = await db.collection('chatUnlocks').doc(`${userId}_${characterId}`).get();
        if (!unlockDoc.exists) {
            throw new HttpsError('permission-denied', 'Please unlock this character first');
        }
    }

    // Load reward rules from character config (NOT hardcoded)
    const rewardRules = character.rewardRules || {};
    const minimumMessageLength = rewardRules.minimumMessageLength || 20;
    const rewardPerQualifiedMessage = rewardRules.rewardPerQualifiedMessage || 0;
    const dailyCap = rewardRules.dailyCap || 50;
    const sessionCap = rewardRules.sessionCap || 10;
    const cooldownSeconds = rewardRules.cooldownSeconds || 60;

    // Save user message first
    const sessionId = `${userId}_${characterId}`;
    const userMsgRef = db.collection('chatMessages').doc();
    await userMsgRef.set({
        sessionId,
        userId,
        characterId,
        content: trimmedContent,
        role: 'user',
        createdAt: FieldValue.serverTimestamp()
    });

    // ─── AI API Call (server-side only) ──────────────────────────────────────
    let aiResponseContent = '';
    const aiApiKey = process.env.AI_API_KEY;
    const aiProvider = process.env.AI_API_PROVIDER || 'google';

    // Load recent message history for context (last 10 messages)
    const historySnapshot = await db.collection('chatMessages')
        .where('sessionId', '==', sessionId)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

    const messageHistory = historySnapshot.docs
        .reverse()
        .map(doc => ({
            role: doc.data().role === 'user' ? 'user' : 'model',
            parts: [{ text: doc.data().content }]
        }));

    if (!aiApiKey) {
        // AI not configured — return service unavailable message
        aiResponseContent = 'AI service is currently being set up. Please check back soon.';
        console.warn('AI_API_KEY not configured');
    } else {
        try {
            if (aiProvider === 'google') {
                // Google Gemini API
                const systemInstruction = character.systemPrompt ||
                    `You are ${character.name}, an AI assistant character. Always identify yourself as an AI when asked.`;

                const payload = {
                    system_instruction: { parts: [{ text: systemInstruction }] },
                    contents: messageHistory
                };

                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${aiApiKey}`;
                const response = await axios.post(geminiUrl, payload, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 30000
                });

                aiResponseContent = response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
                    'I\'m having trouble responding right now. Please try again.';

            } else if (aiProvider === 'openai') {
                // OpenAI API
                const messages = [
                    {
                        role: 'system',
                        content: character.systemPrompt ||
                            `You are ${character.name}, an AI assistant. Always clarify you are an AI when asked.`
                    },
                    ...messageHistory.map(m => ({
                        role: m.role === 'model' ? 'assistant' : 'user',
                        content: m.parts[0].text
                    }))
                ];

                const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                    model: 'gpt-4o-mini',
                    messages,
                    max_tokens: 500,
                    temperature: 0.7
                }, {
                    headers: {
                        Authorization: `Bearer ${aiApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                });

                aiResponseContent = response.data?.choices?.[0]?.message?.content ||
                    'I\'m having trouble responding right now. Please try again.';
            }
        } catch (aiError) {
            console.error('AI API error:', aiError.response?.data || aiError.message);
            aiResponseContent = 'I\'m having a moment. Please send your message again.';
        }
    }

    // Save AI response
    const aiMsgRef = db.collection('chatMessages').doc();
    await aiMsgRef.set({
        sessionId,
        userId,
        characterId,
        content: aiResponseContent,
        role: 'ai',
        createdAt: FieldValue.serverTimestamp()
    });

    // ─── Reward Eligibility Evaluation ───────────────────────────────────────
    let rewardGranted = false;

    if (rewardPerQualifiedMessage > 0) {
        const eligible = await evaluateRewardEligibility(
            userId, characterId, trimmedContent,
            { minimumMessageLength, dailyCap, sessionCap, cooldownSeconds }
        );

        if (eligible.qualified) {
            // Create pending reward (processed in batch by evaluateChatReward scheduled function)
            await db.collection('chatRewards').add({
                userId,
                characterId,
                messageId: userMsgRef.id,
                amount: rewardPerQualifiedMessage,
                status: 'PENDING',
                createdAt: FieldValue.serverTimestamp()
            });
            rewardGranted = true;
        }
    }

    return {
        response: aiResponseContent,
        rewardGranted,
        messageId: userMsgRef.id
    };
});

/**
 * Evaluate whether a message qualifies for a reward.
 * Anti-spam and quality checks applied here.
 */
async function evaluateRewardEligibility(userId, characterId, content, rules) {
    const { minimumMessageLength, dailyCap, sessionCap, cooldownSeconds } = rules;

    // Check minimum length
    if (content.length < minimumMessageLength) {
        return { qualified: false, reason: 'message_too_short' };
    }

    // Check word count (at least 3 meaningful words)
    const words = content.trim().split(/\s+/).filter(w => w.length > 1);
    if (words.length < 3) {
        return { qualified: false, reason: 'insufficient_words' };
    }

    // Check for repeated characters spam (e.g., "aaaaaaaaaa")
    if (/(.)(\1){9,}/.test(content)) {
        return { qualified: false, reason: 'spam_detected' };
    }

    // Check for repeated word spam (e.g., "hi hi hi hi hi")
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    if (uniqueWords.size === 1 && words.length > 3) {
        return { qualified: false, reason: 'repeated_words' };
    }

    // Check daily cap
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyRewards = await db.collection('chatRewards')
        .where('userId', '==', userId)
        .where('createdAt', '>=', today)
        .where('status', 'in', ['PENDING', 'APPROVED'])
        .get();

    if (dailyRewards.size >= dailyCap) {
        return { qualified: false, reason: 'daily_cap_reached' };
    }

    // Check cooldown — last rewarded message for this character
    if (cooldownSeconds > 0) {
        const cooldownTime = new Date(Date.now() - cooldownSeconds * 1000);
        const recentReward = await db.collection('chatRewards')
            .where('userId', '==', userId)
            .where('characterId', '==', characterId)
            .where('createdAt', '>=', cooldownTime)
            .limit(1)
            .get();

        if (!recentReward.empty) {
            return { qualified: false, reason: 'cooldown_active' };
        }
    }

    return { qualified: true };
}

/**
 * evaluateChatReward - Scheduled function to process pending chat rewards
 * Runs every hour, credits approved rewards to wallets
 */
exports.evaluateChatReward = onSchedule('every 60 minutes', async () => {
    const pendingRewards = await db.collection('chatRewards')
        .where('status', '==', 'PENDING')
        .limit(200)
        .get();

    if (pendingRewards.empty) return;

    console.log(`Processing ${pendingRewards.docs.length} pending chat rewards`);

    for (const doc of pendingRewards.docs) {
        const reward = doc.data();

        try {
            await db.runTransaction(async (transaction) => {
                const rewardRef = doc.ref;
                const currentDoc = await transaction.get(rewardRef);

                // Idempotency check
                if (currentDoc.data().status !== 'PENDING') return;

                const walletRef = db.collection('wallets').doc(reward.userId);
                const walletDoc = await transaction.get(walletRef);

                if (!walletDoc.exists) {
                    console.error(`Wallet not found for user ${reward.userId}`);
                    return;
                }

                // Credit wallet
                transaction.update(walletRef, {
                    availableBalance: FieldValue.increment(reward.amount),
                    lifetimeEarned: FieldValue.increment(reward.amount),
                    updatedAt: FieldValue.serverTimestamp()
                });

                // Create ledger entry
                const txRef = db.collection('walletTransactions').doc();
                transaction.set(txRef, {
                    userId: reward.userId,
                    type: 'AI_TRAINING_REWARD', // We'll use a specific chat type
                    direction: 'IN',
                    amount: reward.amount,
                    currency: 'KES',
                    status: 'COMPLETED',
                    description: 'Chat & Earn reward',
                    referenceId: doc.id,
                    metadata: { characterId: reward.characterId },
                    createdAt: FieldValue.serverTimestamp()
                });

                // Mark reward as approved
                transaction.update(rewardRef, {
                    status: 'APPROVED',
                    processedAt: FieldValue.serverTimestamp()
                });
            });
        } catch (err) {
            console.error(`Failed to process chat reward ${doc.id}:`, err);
        }
    }
});
