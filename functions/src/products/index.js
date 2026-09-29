const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const mpesa = require('../payments/mpesa'); // Assumed we might need if calling stk directly, but we use payments module

const db = getFirestore();
const storage = getStorage();

exports.purchaseProduct = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

    const { productId, phone } = request.data;
    if (!productId) throw new HttpsError('invalid-argument', 'Product ID required');

    const userId = request.auth.uid;
    const productRef = db.collection('products').doc(productId);
    const productDoc = await productRef.get();

    if (!productDoc.exists) throw new HttpsError('not-found', 'Product not found');
    const product = productDoc.data();

    if (product.status !== 'ACTIVE') throw new HttpsError('failed-precondition', 'Product not available');

    const purchaseQuery = await db.collection('productPurchases')
        .where('userId', '==', userId)
        .where('productId', '==', productId)
        .get();

    if (!purchaseQuery.empty) {
        throw new HttpsError('already-exists', 'You already own this product');
    }

    const amount = product.price;

    const paymentRef = db.collection('payments').doc();
    
    // Normalize phone
    let normalizedPhone = phone.replace(/[^0-9]/g, '');
    if (normalizedPhone.startsWith('0')) normalizedPhone = '254' + normalizedPhone.slice(1);
    
    await paymentRef.set({
        userId,
        amount,
        phone: normalizedPhone,
        purpose: 'PRODUCT_PURCHASE',
        referenceId: productId,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
    });

    const callbackUrl = `https://${process.env.GCLOUD_PROJECT}.cloudfunctions.net/handleMpesaCallback`;

    try {
        const stkResponse = await mpesa.initiateStkPush({
            phone: normalizedPhone,
            amount: amount,
            accountReference: 'PRODUCT',
            description: `Purchase ${product.title}`.substring(0, 13),
            callbackUrl
        });

        await paymentRef.update({
            merchantRequestId: stkResponse.MerchantRequestID,
            checkoutRequestId: stkResponse.CheckoutRequestID,
            updatedAt: new Date()
        });

        return {
            paymentId: paymentRef.id,
            checkoutRequestId: stkResponse.CheckoutRequestID
        };
    } catch (error) {
        await paymentRef.update({ status: 'FAILED' });
        throw new HttpsError('internal', 'Payment initiation failed');
    }
});

async function grantProductAccess(transaction, userId, productId, paymentId) {
    const accessRef = db.collection('productAccess').doc(`${userId}_${productId}`);
    const purchaseRef = db.collection('productPurchases').doc();
    const auditRef = db.collection('auditLogs').doc();

    const accessDoc = await transaction.get(accessRef);
    if (accessDoc.exists) {
        return; // Already granted
    }

    transaction.set(accessRef, {
        userId,
        productId,
        paymentId,
        grantedAt: new Date(),
        status: 'ACTIVE'
    });

    transaction.set(purchaseRef, {
        userId,
        productId,
        paymentId,
        purchasedAt: new Date()
    });

    transaction.set(auditRef, {
        type: 'PRODUCT_ACCESS_GRANTED',
        userId,
        productId,
        paymentId,
        createdAt: new Date()
    });
}

exports.getProductAccess = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

    const { productId } = request.data;
    const userId = request.auth.uid;

    const accessDoc = await db.collection('productAccess').doc(`${userId}_${productId}`).get();
    
    if (!accessDoc.exists || accessDoc.data().status !== 'ACTIVE') {
        throw new HttpsError('permission-denied', 'No access to this product');
    }

    const productDoc = await db.collection('products').doc(productId).get();
    if (!productDoc.exists) throw new HttpsError('not-found', 'Product not found');
    
    const fileUrl = productDoc.data().fileUrl;
    if (!fileUrl) throw new HttpsError('not-found', 'Product file not found');

    // Generate signed URL if it's a storage gs:// path, or just return URL
    let downloadUrl = fileUrl;
    if (fileUrl.startsWith('gs://')) {
        const bucket = storage.bucket();
        const filePath = fileUrl.replace(`gs://${bucket.name}/`, '');
        const file = bucket.file(filePath);
        
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 1000 * 60 * 60 // 1 hour
        });
        downloadUrl = url;
    }

    return { downloadUrl };
});

module.exports = {
    purchaseProduct: exports.purchaseProduct,
    grantProductAccess,
    getProductAccess: exports.getProductAccess
};
