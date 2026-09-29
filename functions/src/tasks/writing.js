const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.submitWritingTask = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
    
    const userId = context.auth.uid;
    const { taskId, content, wordCount } = data;
    const db = admin.firestore();

    const taskRef = db.collection('writingTasks').doc(taskId);
    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) throw new functions.https.HttpsError('not-found', 'Task not found.');

    const task = taskDoc.data();
    if (wordCount < task.wordCountMin) {
        throw new functions.https.HttpsError('invalid-argument', 'Word count too low.');
    }

    const submissionRef = db.collection('writingSubmissions').doc();
    await submissionRef.set({
        taskId,
        userId,
        content,
        wordCount,
        status: 'PENDING_REVIEW',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { submissionId: submissionRef.id };
});

exports.approveWritingTask = functions.https.onCall(async (data, context) => {
    const { submissionId } = data;
    const db = admin.firestore();

    const subRef = db.collection('writingSubmissions').doc(submissionId);
    const subDoc = await subRef.get();
    if (!subDoc.exists) throw new functions.https.HttpsError('not-found', 'Submission not found.');

    const submission = subDoc.data();
    if (submission.status === 'APPROVED') return { status: 'already_approved' };

    const taskRef = db.collection('writingTasks').doc(submission.taskId);
    const taskDoc = await taskRef.get();
    const reward = taskDoc.data().reward || 0;

    const walletRef = db.collection('wallets').doc(submission.userId);
    await walletRef.set({ balance: admin.firestore.FieldValue.increment(reward) }, { merge: true });

    await subRef.update({ status: 'APPROVED' });

    return { status: 'approved', reward };
});