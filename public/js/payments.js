const payments = {
    async initiateStkPush({ amount, phone, purpose, referenceId }) {
        try {
            const createStkPush = firebase.functions().httpsCallable('createStkPush');
            const response = await createStkPush({ amount, phone, purpose, referenceId });
            return response.data;
        } catch (error) {
            console.error('STK Push Error:', error);
            throw error;
        }
    },

    async pollPaymentStatus(paymentId, maxAttempts = 20) {
        const queryMpesaTransaction = firebase.functions().httpsCallable('queryMpesaTransaction');
        let attempts = 0;

        return new Promise((resolve, reject) => {
            const interval = setInterval(async () => {
                attempts++;
                try {
                    const response = await queryMpesaTransaction({ paymentId });
                    const status = response.data.status;

                    if (status === 'SUCCESS' || status === 'FAILED') {
                        clearInterval(interval);
                        resolve(response.data);
                    } else if (attempts >= maxAttempts) {
                        clearInterval(interval);
                        resolve({ status: 'TIMEOUT', resultDescription: 'Polling timed out' });
                    }
                } catch (error) {
                    clearInterval(interval);
                    reject(error);
                }
            }, 5000);
        });
    },

    showPaymentModal({ amount, phone, purpose, referenceId, onSuccess, onFail }) {
        // Create modal HTML if it doesn't exist
        if (!document.getElementById('payment-modal')) {
            const modalHtml = `
                <div id="payment-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
                    <div class="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
                        <h3 class="text-lg font-bold mb-4">Complete Payment</h3>
                        <div id="payment-status-content" class="text-center">
                            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                            <p class="text-gray-600 mb-2 font-semibold">Check your phone</p>
                            <p class="text-sm text-gray-500">Enter your M-Pesa PIN to pay KES ${amount}</p>
                        </div>
                        <button id="close-payment-modal" class="w-full mt-6 bg-gray-200 text-gray-800 py-2 rounded font-semibold hidden">Close</button>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            document.getElementById('close-payment-modal').addEventListener('click', this.hidePaymentModal);
        }

        const modal = document.getElementById('payment-modal');
        const statusContent = document.getElementById('payment-status-content');
        const closeBtn = document.getElementById('close-payment-modal');
        
        statusContent.innerHTML = `
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p class="text-gray-600 mb-2 font-semibold">Check your phone</p>
            <p class="text-sm text-gray-500">Enter your M-Pesa PIN to pay KES ${amount}</p>
        `;
        closeBtn.classList.add('hidden');
        modal.classList.remove('hidden');

        this.initiateStkPush({ amount, phone, purpose, referenceId })
            .then(data => {
                return this.pollPaymentStatus(data.paymentId);
            })
            .then(result => {
                if (result.status === 'SUCCESS') {
                    statusContent.innerHTML = `
                        <div class="mb-4" style="display:flex; justify-content:center;">
                            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#30d158" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="16 9 10 15 7 12"/></svg>
                        </div>
                        <p class="text-gray-800 font-bold mb-2">Payment Confirmed!</p>
                        <p class="text-sm text-gray-500">${result.resultDescription || 'Success'}</p>
                    `;
                    setTimeout(() => {
                        this.hidePaymentModal();
                        if (onSuccess) onSuccess(result);
                    }, 2000);
                } else {
                    statusContent.innerHTML = `
                        <div class="mb-4" style="display:flex; justify-content:center;">
                            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#ff453a" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                        </div>
                        <p class="text-gray-800 font-bold mb-2">Payment Failed</p>
                        <p class="text-sm text-gray-500">${result.resultDescription || 'Please try again'}</p>
                    `;
                    closeBtn.classList.remove('hidden');
                    if (onFail) onFail(result);
                }
            })
            .catch(error => {
                statusContent.innerHTML = `
                    <div class="mb-4" style="display:flex; justify-content:center;">
                        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#ff453a" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    </div>
                    <p class="text-gray-800 font-bold mb-2">Error</p>
                    <p class="text-sm text-gray-500">${error.message || 'An error occurred'}</p>
                `;
                closeBtn.classList.remove('hidden');
                if (onFail) onFail(error);
            });
    },

    hidePaymentModal() {
        const modal = document.getElementById('payment-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    validateMpesaPhone(phone) {
        const normalized = phone.replace(/[^0-9]/g, '');
        if (normalized.length === 10 && normalized.startsWith('0')) return true;
        if (normalized.length === 12 && normalized.startsWith('254')) return true;
        if (normalized.length === 9) return true; // assuming local format missing prefix
        return false;
    },

    maskPhone(phone) {
        if (!phone) return '';
        const normalized = phone.replace(/[^0-9]/g, '');
        if (normalized.length >= 9) {
            const last4 = normalized.slice(-4);
            return `+254 ••• ••• ${last4}`;
        }
        return phone;
    }
};

window.payments = payments;
