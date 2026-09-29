const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.submitAiTraining = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
    
    const userId = context.auth.uid;
    const { taskId, selection, reasoning, confidence } = data;
    const db = admin.firestore();

    const subRef = db.collection('aiTrainingSubmissions').doc(`${userId}_${taskId}`);
    const subDoc = await subRef.get();
    if (subDoc.exists) throw new functions.https.HttpsError('already-exists', 'Task already completed.');

    const taskRef = db.collection('aiTrainingTasks').doc(taskId);
    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) throw new functions.https.HttpsError('not-found', 'Task not found.');

    await subRef.set({
        userId,
        taskId,
        selection,
        reasoning,
        confidence,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const reward = taskDoc.data().reward || 0;
    const walletRef = db.collection('wallets').doc(userId);
    await walletRef.set({ balance: admin.firestore.FieldValue.increment(reward) }, { merge: true });

    return { status: 'success', reward };
});