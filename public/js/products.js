const productsModule = {
    async loadProducts(options = {}) {
        let query = firebase.firestore().collection('products').where('status', '==', 'ACTIVE');
        
        if (options.category && options.category !== 'All') {
            query = query.where('category', '==', options.category);
        }
        
        if (options.limit) {
            query = query.limit(options.limit);
        }
        
        if (options.startAfter) {
            query = query.startAfter(options.startAfter);
        }

        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async loadProduct(productId) {
        const doc = await firebase.firestore().collection('products').doc(productId).get();
        if (!doc.exists) throw new Error('Product not found');
        return { id: doc.id, ...doc.data() };
    },

    async checkProductAccess(productId) {
        const user = firebase.auth().currentUser;
        if (!user) return false;

        const doc = await firebase.firestore().collection('productAccess').doc(`${user.uid}_${productId}`).get();
        return doc.exists && doc.data().status === 'ACTIVE';
    },

    async getProductDownloadUrl(productId) {
        try {
            const getAccess = firebase.functions().httpsCallable('getProductAccess');
            const response = await getAccess({ productId });
            return response.data.downloadUrl;
        } catch (error) {
            console.error('Error getting download URL:', error);
            throw error;
        }
    },

    async purchaseProduct(productId) {
        const user = firebase.auth().currentUser;
        if (!user) throw new Error('Must be logged in to purchase');

        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        const phone = userDoc.data().phone || prompt("Enter M-Pesa Phone Number (e.g. 0712345678):");
        
        if (!phone) throw new Error('Phone number required');

        const product = await this.loadProduct(productId);
        
        window.payments.showPaymentModal({
            amount: product.price,
            phone: phone,
            purpose: 'PRODUCT_PURCHASE',
            referenceId: productId,
            onSuccess: () => {
                window.location.reload();
            },
            onFail: (err) => {
                alert('Payment failed: ' + (err.resultDescription || 'Unknown error'));
            }
        });
    }
};

window.products = productsModule;
