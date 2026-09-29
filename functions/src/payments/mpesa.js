const axios = require('axios');
const { getFunctions } = require('firebase-admin/functions');

let tokenCache = null;
let tokenExpiry = null;

const getEnv = () => process.env.APP_ENV === 'production' ? 'production' : 'sandbox';

const getBaseUrl = () => {
    return getEnv() === 'production' 
        ? 'https://api.safaricom.co.ke' 
        : 'https://sandbox.safaricom.co.ke';
};

async function getMpesaToken() {
    if (tokenCache && tokenExpiry && Date.now() < tokenExpiry) {
        return tokenCache;
    }

    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    
    if (!consumerKey || !consumerSecret) {
        throw new Error('M-Pesa credentials not configured');
    }

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const url = `${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`;

    try {
        const response = await axios.get(url, {
            headers: { Authorization: `Basic ${auth}` }
        });
        
        tokenCache = response.data.access_token;
        // Expire 1 minute before actual expiry (usually 3599s)
        tokenExpiry = Date.now() + ((response.data.expires_in - 60) * 1000);
        return tokenCache;
    } catch (error) {
        console.error('Error fetching M-Pesa token:', error.response?.data || error.message);
        throw new Error('Failed to authenticate with M-Pesa');
    }
}

function generateStkPassword(shortcode, passkey, timestamp) {
    return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
}

async function initiateStkPush({ phone, amount, accountReference, description, callbackUrl }) {
    const token = await getMpesaToken();
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    
    if (!shortcode || !passkey) {
        throw new Error('M-Pesa STK push credentials not configured');
    }

    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = generateStkPassword(shortcode, passkey, timestamp);

    const payload = {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phone,
        PartyB: shortcode,
        PhoneNumber: phone,
        CallBackURL: callbackUrl,
        AccountReference: accountReference.substring(0, 12),
        TransactionDesc: description.substring(0, 13)
    };

    const url = `${getBaseUrl()}/mpesa/stkpush/v1/processrequest`;

    try {
        const response = await axios.post(url, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        console.error('STK Push error:', error.response?.data || error.message);
        throw new Error('Failed to initiate STK Push');
    }
}

async function queryStkStatus(checkoutRequestId) {
    const token = await getMpesaToken();
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = generateStkPassword(shortcode, passkey, timestamp);

    const payload = {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
    };

    const url = `${getBaseUrl()}/mpesa/stkpushquery/v1/query`;

    try {
        const response = await axios.post(url, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        console.error('STK Query error:', error.response?.data || error.message);
        throw new Error('Failed to query STK status');
    }
}

async function initiateB2C({ phone, amount, remarks, occasion, callbackUrl }) {
    const token = await getMpesaToken();
    const shortcode = process.env.MPESA_B2C_SHORTCODE;
    const initiatorName = process.env.MPESA_B2C_INITIATOR;
    const securityCredential = process.env.MPESA_B2C_SECURITY_CREDENTIAL;

    const payload = {
        InitiatorName: initiatorName,
        SecurityCredential: securityCredential,
        CommandID: 'BusinessPayment',
        Amount: amount,
        PartyA: shortcode,
        PartyB: phone,
        Remarks: remarks,
        QueueTimeOutURL: callbackUrl,
        ResultURL: callbackUrl,
        Occasion: occasion
    };

    const url = `${getBaseUrl()}/mpesa/b2c/v1/paymentrequest`;

    try {
        const response = await axios.post(url, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        console.error('B2C error:', error.response?.data || error.message);
        throw new Error('Failed to initiate B2C payment');
    }
}

function validateCallback(callbackData) {
    if (!callbackData || !callbackData.Body || !callbackData.Body.stkCallback) {
        return false;
    }
    return true;
}

module.exports = {
    getMpesaToken,
    generateStkPassword,
    initiateStkPush,
    queryStkStatus,
    initiateB2C,
    validateCallback
};
