/**
 * EARNWAVE - Firebase Emulator Seed Script
 * 
 * DEVELOPMENT ONLY — Never run against production Firestore.
 * 
 * Usage:
 *   node scripts/seed-emulator.js
 * 
 * Prerequisites:
 *   firebase emulators:start
 */

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

initializeApp({ projectId: 'moneywave-2f651' });
const db = getFirestore();

async function seed() {
    console.log('🌱 Seeding EARNWAVE emulator...\n');

    // ─── System Settings ────────────────────────────────────────────────────
    console.log('📋 Creating system settings...');

    await db.collection('systemSettings').doc('activation').set({
        enabled: false,
        amount: 200,
        description: 'One-time account activation fee',
        updatedAt: new Date()
    });

    await db.collection('systemSettings').doc('withdrawals').set({
        enabled: true,
        minimumAmount: 100,
        maximumAmount: 50000,
        dailyLimit: 100000,
        feeType: 'flat',
        feeValue: 20,
        currency: 'KES',
        updatedAt: new Date()
    });

    await db.collection('systemSettings').doc('referrals').set({
        enabled: true,
        reward: 100,
        qualificationCriteria: 'first_task_approved',
        updatedAt: new Date()
    });

    await db.collection('systemSettings').doc('chat').set({
        enabled: true,
        rewardPerQualifiedMessage: 2,
        dailyCap: 50,
        sessionCap: 10,
        minimumMessageLength: 25,
        cooldownSeconds: 120,
        updatedAt: new Date()
    });

    await db.collection('systemSettings').doc('general').set({
        appName: 'EARNWAVE',
        maintenanceMode: false,
        supportEmail: 'support@earnwave.co.ke',
        updatedAt: new Date()
    });

    // ─── Demo Admin User ────────────────────────────────────────────────────
    console.log('👤 Creating demo admin user...');

    const adminUid = 'demo-admin-001';
    await db.collection('users').doc(adminUid).set({
        uid: adminUid,
        email: 'admin@earnwave.co.ke',
        username: 'admin',
        phone: '254712000001',
        displayName: 'EARNWAVE Admin',
        status: 'ACTIVE',
        referralCode: 'ADMIN01',
        createdAt: new Date(),
        updatedAt: new Date(),
        riskScore: 0,
        riskFlags: []
    });

    await db.collection('wallets').doc(adminUid).set({
        userId: adminUid,
        availableBalance: 0,
        pendingBalance: 0,
        lifetimeEarned: 0,
        lifetimeWithdrawn: 0,
        currency: 'KES',
        createdAt: new Date(),
        updatedAt: new Date()
    });

    // ─── Demo Regular User ──────────────────────────────────────────────────
    console.log('👤 Creating demo user...');

    const demoUid = 'demo-user-001';
    await db.collection('users').doc(demoUid).set({
        uid: demoUid,
        email: 'demo@earnwave.co.ke',
        username: 'demouser',
        phone: '254712345678',
        displayName: 'Demo User',
        status: 'ACTIVE',
        referralCode: 'DEMO01',
        createdAt: new Date(),
        updatedAt: new Date(),
        riskScore: 0,
        riskFlags: []
    });

    await db.collection('wallets').doc(demoUid).set({
        userId: demoUid,
        availableBalance: 1500,
        pendingBalance: 200,
        lifetimeEarned: 2500,
        lifetimeWithdrawn: 800,
        currency: 'KES',
        createdAt: new Date(),
        updatedAt: new Date()
    });

    // Demo transactions for this user
    const transactions = [
        { type: 'TASK_REWARD', direction: 'IN', amount: 650, description: 'Task: Debug Code Snippet', status: 'COMPLETED' },
        { type: 'SURVEY_REWARD', direction: 'IN', amount: 300, description: 'Survey: Consumer Preferences', status: 'COMPLETED' },
        { type: 'WITHDRAWAL', direction: 'OUT', amount: 800, description: 'M-Pesa Withdrawal', status: 'COMPLETED' },
        { type: 'REVIEW_REWARD', direction: 'IN', amount: 600, description: 'Hotel Review: Sarova Stanley', status: 'COMPLETED', metadata: { pending: false } },
        { type: 'AI_TRAINING_REWARD', direction: 'IN', amount: 150, description: 'AI Training: Response Ranking', status: 'COMPLETED' },
        { type: 'TASK_REWARD', direction: 'IN', amount: 200, description: 'Task: Fact Verification', status: 'PENDING' }
    ];

    for (const tx of transactions) {
        await db.collection('walletTransactions').add({
            userId: demoUid,
            currency: 'KES',
            referenceId: null,
            metadata: {},
            createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
            ...tx
        });
    }

    // ─── Tasks ──────────────────────────────────────────────────────────────
    console.log('📝 Creating sample tasks...');

    const tasks = [
        {
            type: 'MICROTASK',
            title: 'Code & Logic: Debug a Snippet',
            description: 'Analyze a short code snippet, identify the bug, and explain the fix.',
            instructions: 'You will be shown a code snippet with a bug. Identify the bug, explain what it does wrong, and provide the corrected code. Minimum 100 characters in your explanation.',
            reward: 650,
            unlockFee: 0,
            difficulty: 'HIGH',
            estimatedMinutes: 15,
            maxAttempts: 1,
            dailyLimit: 50,
            status: 'PUBLISHED',
            validationMethod: 'MANUAL_REVIEW',
            rewardAmount: 650
        },
        {
            type: 'MICROTASK',
            title: 'Fact Verification Task',
            description: 'Verify the accuracy of a set of statements using reliable sources.',
            instructions: 'You will be presented with 5 statements. Research each and determine if it is True, False, or Unverifiable. Provide a brief explanation for each.',
            reward: 500,
            unlockFee: 0,
            difficulty: 'MEDIUM',
            estimatedMinutes: 20,
            maxAttempts: 1,
            dailyLimit: 30,
            status: 'PUBLISHED',
            validationMethod: 'MANUAL_REVIEW',
            rewardAmount: 500
        },
        {
            type: 'MICROTASK',
            title: 'AI Response Evaluation',
            description: 'Evaluate two AI-generated responses and select the more accurate one.',
            instructions: 'Compare two AI responses to the same question. Rate each on accuracy, helpfulness, and clarity. Select which is better and explain why (min 50 characters).',
            reward: 300,
            unlockFee: 0,
            difficulty: 'LOW',
            estimatedMinutes: 10,
            maxAttempts: 3,
            dailyLimit: 100,
            status: 'PUBLISHED',
            validationMethod: 'AUTO',
            rewardAmount: 300
        },
        {
            type: 'WRITING',
            title: 'Write a Product Review',
            description: 'Write an honest, detailed review of a consumer product.',
            instructions: 'Write a review of a consumer electronics product you have used. Include pros, cons, and a recommendation. 200-500 words required.',
            reward: 400,
            unlockFee: 0,
            difficulty: 'MEDIUM',
            estimatedMinutes: 25,
            maxAttempts: 1,
            dailyLimit: 20,
            wordCountMin: 200,
            wordCountMax: 500,
            status: 'PUBLISHED',
            validationMethod: 'MANUAL_REVIEW',
            rewardAmount: 400
        }
    ];

    for (const task of tasks) {
        await db.collection('tasks').add({
            ...task,
            publishedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }

    // ─── Hotels ─────────────────────────────────────────────────────────────
    console.log('🏨 Creating sample hotels...');

    const hotels = [
        {
            name: 'Sarova Stanley Hotel',
            location: 'Nairobi, Kenya',
            country: 'KE',
            rating: 4.5,
            description: 'Historic luxury hotel in the heart of Nairobi, offering premium accommodation and world-class facilities.',
            unlockFee: 0,
            reward: 600,
            status: 'ACTIVE',
            imageUrl: null
        },
        {
            name: 'Villa Rosa Kempinski',
            location: 'Nairobi, Kenya',
            country: 'KE',
            rating: 4.8,
            description: 'Nairobi\'s premier luxury hotel offering an unparalleled experience with exquisite dining and spa.',
            unlockFee: 100,
            reward: 800,
            status: 'ACTIVE',
            imageUrl: null
        },
        {
            name: 'Serena Beach Resort',
            location: 'Mombasa, Kenya',
            country: 'KE',
            rating: 4.6,
            description: 'Stunning beachfront resort with coral garden architecture, offering a unique coastal experience.',
            unlockFee: 50,
            reward: 700,
            status: 'ACTIVE',
            imageUrl: null
        }
    ];

    for (const hotel of hotels) {
        await db.collection('hotels').add({
            ...hotel,
            instructions: `Write a detailed review of your experience at ${hotel.name}. Rate different aspects and share genuine feedback to help other travellers.`,
            requirements: { minRating: 1, maxRating: 5, minWords: 100, requiresPhotos: false },
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }

    // ─── Surveys ────────────────────────────────────────────────────────────
    console.log('📊 Creating sample surveys...');

    const surveyRef = await db.collection('surveys').add({
        title: 'Consumer Shopping Habits in Kenya',
        description: 'Help us understand how Kenyans shop online and offline.',
        estimatedMinutes: 5,
        questionCount: 5,
        reward: 250,
        status: 'ACTIVE',
        autoApprove: true,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    const surveyQuestions = [
        { type: 'single_choice', question: 'How often do you shop online?', options: ['Daily', 'Weekly', 'Monthly', 'Rarely', 'Never'], required: true, order: 1 },
        { type: 'multiple_choice', question: 'Which platforms do you use for online shopping?', options: ['Jumia', 'Kilimall', 'Amazon', 'AliExpress', 'Local seller websites', 'Social media'], required: true, order: 2 },
        { type: 'single_choice', question: 'What is your preferred payment method?', options: ['M-Pesa', 'Card', 'Cash on delivery', 'Bank transfer'], required: true, order: 3 },
        { type: 'rating', question: 'How would you rate online shopping in Kenya overall?', scale: 5, required: true, order: 4 },
        { type: 'text', question: 'What would improve your online shopping experience in Kenya?', minLength: 20, required: false, order: 5 }
    ];

    for (const q of surveyQuestions) {
        await db.collection('surveyQuestions').add({
            surveyId: surveyRef.id,
            ...q
        });
    }

    // ─── AI Training Tasks ──────────────────────────────────────────────────
    console.log('🤖 Creating AI training tasks...');

    await db.collection('aiTrainingTasks').add({
        type: 'response_ranking',
        title: 'Evaluate Legal Explanations',
        prompt: 'Explain the concept of negligence in Kenyan law.',
        responseA: 'Negligence in Kenya, governed under the Law of Tort, requires proving four elements: duty of care, breach of that duty, causation, and damages. The case of Donoghue v Stevenson (applied in Kenya) established the neighbour principle.',
        responseB: 'Negligence is when someone does something bad and hurts another person. In Kenya, courts look at whether the person was careful enough.',
        instructions: 'Which response better explains negligence in Kenyan law? Consider accuracy, legal terminology, and usefulness.',
        options: ['Response A is better', 'Response B is better', 'Both are equally good', 'Neither is satisfactory'],
        reward: 50,
        status: 'PUBLISHED',
        rewardAmount: 50,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    // Answer key stored SEPARATELY (not accessible by clients)
    // In production this would be stored in a server-only admin collection
    // We omit it from the seed to reflect the security principle

    // ─── Digital Products ───────────────────────────────────────────────────
    console.log('📦 Creating sample products...');

    const products = [
        {
            title: '365-Day Social Media Content Calendar',
            description: 'Plan your entire year of social media content. Includes daily post ideas, hashtag strategies, and engagement tips tailored for Kenyan businesses.',
            category: 'Templates',
            price: 500,
            status: 'ACTIVE',
            fileUrl: null // Would be gs://bucket/products/calendar.pdf in production
        },
        {
            title: 'Freelance Blueprint: Kenya Edition',
            description: 'Complete guide to launching and growing a successful freelance career in Kenya. From finding clients to managing payments and taxes.',
            category: 'eBooks',
            price: 750,
            status: 'ACTIVE',
            fileUrl: null
        },
        {
            title: 'Professional CV & Cover Letter Kit',
            description: 'ATS-optimized CV templates and cover letter guides for Kenyan job seekers. Includes 10 industry-specific templates.',
            category: 'Templates',
            price: 350,
            status: 'ACTIVE',
            fileUrl: null
        }
    ];

    for (const product of products) {
        await db.collection('products').add({
            ...product,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }

    // ─── AI Chat Characters ─────────────────────────────────────────────────
    console.log('💬 Creating sample AI chat characters...');

    await db.collection('chatCharacters').add({
        name: 'Amara',
        country: 'KE',
        countryEmoji: '🇰🇪',
        age: 26,
        bio: 'A friendly and knowledgeable AI assistant focused on Kenyan business and entrepreneurship. Ask about business ideas, local markets, or general advice.',
        personality: 'Helpful, encouraging, practical, culturally aware',
        communicationStyle: 'Friendly and professional',
        systemPrompt: 'You are Amara, an AI assistant specializing in Kenyan business and entrepreneurship. You are friendly, helpful, and knowledgeable about Kenyan markets, regulations, and opportunities. Always identify yourself as an AI when asked. Provide practical, actionable advice.',
        status: 'ACTIVE',
        unlockFee: 0,
        rewardRules: {
            minimumMessageLength: 25,
            rewardPerQualifiedMessage: 2,
            dailyCap: 50,
            sessionCap: 10,
            cooldownSeconds: 120
        },
        createdAt: new Date(),
        updatedAt: new Date()
    });

    await db.collection('chatCharacters').add({
        name: 'Kwame',
        country: 'GH',
        countryEmoji: '🇬🇭',
        age: 30,
        bio: 'An AI assistant specializing in technology, software development, and digital skills for African markets.',
        personality: 'Tech-savvy, analytical, motivating',
        communicationStyle: 'Clear and educational',
        systemPrompt: 'You are Kwame, an AI assistant specializing in technology and digital skills. You help users learn programming, understand technology trends, and navigate the digital economy. Always identify yourself as an AI when asked.',
        status: 'ACTIVE',
        unlockFee: 100,
        rewardRules: {
            minimumMessageLength: 30,
            rewardPerQualifiedMessage: 3,
            dailyCap: 60,
            sessionCap: 12,
            cooldownSeconds: 90
        },
        createdAt: new Date(),
        updatedAt: new Date()
    });

    // ─── Sample Completed Withdrawals for Social Proof ──────────────────────
    console.log('💸 Creating sample completed withdrawals for social proof...');

    const withdrawalAmounts = [1000, 2500, 500, 5000, 1500, 3000];
    for (const amount of withdrawalAmounts) {
        await db.collection('withdrawals').add({
            userId: `demo-user-${Math.floor(Math.random() * 100)}`,
            amount,
            fee: 20,
            netAmount: amount - 20,
            phone: `2547${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
            status: 'COMPLETED',
            providerReference: `MP${Date.now()}`,
            createdAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
            updatedAt: new Date()
        });
    }

    console.log('\n✅ EARNWAVE emulator seed complete!');
    console.log('\nDemo accounts:');
    console.log('  Admin:  admin@earnwave.co.ke (set admin claim manually via setAdminClaim function)');
    console.log('  User:   demo@earnwave.co.ke');
    console.log('\nUpdate public/js/config.js with your Firebase project credentials before testing.');
    console.log('Run: firebase emulators:start');

    process.exit(0);
}

seed().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});
