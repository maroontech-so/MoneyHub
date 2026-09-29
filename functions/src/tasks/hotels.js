const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.unlockHotelReview = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
    
    const userId = context.auth.uid;
    const { hotelId } = data;
    const db = admin.firestore();

    const hotelRef = db.collection('hotels').doc(hotelId);
    const hotelDoc = await hotelRef.get();
    if (!hotelDoc.exists) throw new functions.https.HttpsError('not-found', 'Hotel not found.');
    
    const hotel = hotelDoc.data();
    if (hotel.status !== 'AVAILABLE') throw new functions.https.HttpsError('failed-precondition', 'Hotel not available.');

    const taskRef = db.collection('hotelTasks').doc(`${userId}_${hotelId}`);
    const taskDoc = await taskRef.get();
    if (taskDoc.exists) throw new functions.https.HttpsError('already-exists', 'Task already unlocked.');

    if (hotel.unlockFee > 0) {
        // initiate STK push logic here...
        return { status: 'payment_required', amount: hotel.unlockFee };
    } else {
        await taskRef.set({
            userId,
            hotelId,
            status: 'UNLOCKED',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { status: 'unlocked' };
    }
});

exports.submitHotelReview = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
    
    const userId = context.auth.uid;
    const { hotelId, rating, title, body, pros, cons, images } = data;
    const db = admin.firestore();

    const taskRef = db.collection('hotelTasks').doc(`${userId}_${hotelId}`);
    const taskDoc = await taskRef.get();
    
    if (!taskDoc.exists || taskDoc.data().status !== 'UNLOCKED') {
        throw new functions.https.HttpsError('failed-precondition', 'Task not unlocked.');
    }

    if (rating < 1 || rating > 5) throw new functions.https.HttpsError('invalid-argument', 'Invalid rating.');
    if (title.length < 10) throw new functions.https.HttpsError('invalid-argument', 'Title too short.');
    if (body.split(' ').length < 100) throw new functions.https.HttpsError('invalid-argument', 'Body too short.');

    const reviewRef = db.collection('hotelReviews').doc();
    await reviewRef.set({
        userId,
        hotelId,
        rating,
        title,
        body,
        pros,
        cons,
        images: images || [],
        status: 'UNDER_REVIEW',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await taskRef.update({ status: 'SUBMITTED' });

    // Send admin notification logic here...
    return { status: 'submitted', reviewId: reviewRef.id };
});

exports.approveHotelReview = functions.https.onCall(async (data, context) => {
    // Admin check omitted for brevity, assume valid
    const { reviewId } = data;
    const db = admin.firestore();

    const reviewRef = db.collection('hotelReviews').doc(reviewId);
    const reviewDoc = await reviewRef.get();
    if (!reviewDoc.exists) throw new functions.https.HttpsError('not-found', 'Review not found.');

    const review = reviewDoc.data();
    if (review.status === 'APPROVED') return { status: 'already_approved' };

    const hotelRef = db.collection('hotels').doc(review.hotelId);
    const hotelDoc = await hotelRef.get();
    const reward = hotelDoc.data().reward || 0;

    // Credit wallet logic
    const walletRef = db.collection('wallets').doc(review.userId);
    await walletRef.update({ balance: admin.firestore.FieldValue.increment(reward) });

    await reviewRef.update({ status: 'APPROVED' });

    return { status: 'approved', reward };
});