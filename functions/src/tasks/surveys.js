const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.startSurvey = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
    
    const userId = context.auth.uid;
    const { surveyId } = data;
    const db = admin.firestore();

    const attemptId = `${userId}_${surveyId}`;
    const attemptRef = db.collection('surveyAttempts').doc(attemptId);
    const attemptDoc = await attemptRef.get();
    
    if (attemptDoc.exists) throw new functions.https.HttpsError('already-exists', 'Survey already attempted.');

    const surveyRef = db.collection('surveys').doc(surveyId);
    const surveyDoc = await surveyRef.get();
    if (!surveyDoc.exists || surveyDoc.data().status !== 'ACTIVE') {
        throw new functions.https.HttpsError('not-found', 'Survey not available.');
    }

    await attemptRef.set({
        userId,
        surveyId,
        status: 'STARTED',
        startedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { attemptId };
});

exports.submitSurvey = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
    
    const userId = context.auth.uid;
    const { attemptId, answers } = data;
    const db = admin.firestore();

    const attemptRef = db.collection('surveyAttempts').doc(attemptId);
    const attemptDoc = await attemptRef.get();

    if (!attemptDoc.exists || attemptDoc.data().userId !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Invalid attempt.');
    }
    if (attemptDoc.data().status !== 'STARTED') {
        throw new functions.https.HttpsError('failed-precondition', 'Survey not in progress.');
    }

    const surveyId = attemptDoc.data().surveyId;
    const surveyRef = db.collection('surveys').doc(surveyId);
    const surveyDoc = await surveyRef.get();
    
    // Validate required questions omitted for brevity

    await attemptRef.update({
        answers,
        status: 'SUBMITTED',
        submittedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const reward = surveyDoc.data().reward || 0;
    
    if (surveyDoc.data().autoApprove) {
        const walletRef = db.collection('wallets').doc(userId);
        await walletRef.set({ balance: admin.firestore.FieldValue.increment(reward) }, { merge: true });
        await attemptRef.update({ status: 'APPROVED' });
        return { status: 'approved', reward };
    }

    return { status: 'submitted', reward: 0 };
});