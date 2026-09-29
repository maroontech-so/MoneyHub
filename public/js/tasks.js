import { getFirestore, doc, getDoc, collection, query, where, getDocs, limit, startAfter, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js';

const db = getFirestore();
const functions = getFunctions();

export async function loadTasks(options = {}) {
    const tasksRef = collection(db, 'tasks');
    let q = query(tasksRef, where('status', '==', 'PUBLISHED'));
    
    if (options.type) q = query(q, where('type', '==', options.type));
    if (options.difficulty) q = query(q, where('difficulty', '==', options.difficulty));
    
    q = query(q, orderBy('createdAt', 'desc'));
    if (options.limit) q = query(q, limit(options.limit));
    if (options.startAfter) q = query(q, startAfter(options.startAfter));

    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({id: d.id, ...d.data()}));
}

export async function loadTask(taskId) {
    const docRef = doc(db, 'tasks', taskId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? {id: docSnap.id, ...docSnap.data()} : null;
}

export async function checkTaskAttempt(userId, taskId) {
    const attemptsRef = collection(db, 'taskAttempts');
    const q = query(attemptsRef, where('userId', '==', userId), where('taskId', '==', taskId), limit(1));
    const snap = await getDocs(q);
    return snap.empty ? null : {id: snap.docs[0].id, ...snap.docs[0].data()};
}

export async function requestTaskUnlock(taskId) {
    const unlockFn = httpsCallable(functions, 'unlockTask');
    return unlockFn({ taskId });
}

export async function submitTask(taskId, submissionData) {
    const submitFn = httpsCallable(functions, 'submitTask');
    return submitFn({ taskId, data: submissionData });
}

export async function loadUserAttempts(userId) {
    const attemptsRef = collection(db, 'taskAttempts');
    const q = query(attemptsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({id: d.id, ...d.data()}));
}
