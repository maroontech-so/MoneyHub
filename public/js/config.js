// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCI3P7jPtGuQMzUAc57XddCLl1VfegfwGA",
  authDomain: "moneywave-2f651.firebaseapp.com",
  databaseURL: "https://moneywave-2f651-default-rtdb.firebaseio.com",
  projectId: "moneywave-2f651",
  storageBucket: "moneywave-2f651.firebasestorage.app",
  messagingSenderId: "1056208942079",
  appId: "1:1056208942079:web:3ba32a59817b1a3f55edca",
  measurementId: "G-LVEZD927PE"
};

// EARNWAVE Application Configuration
const APP_CONFIG = {
  name: 'EARNWAVE',
  currency: 'KES',
  currencySymbol: 'KES',
  version: '1.0.0',
  firebase: firebaseConfig
};

// Utilities
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: APP_CONFIG.currency,
  }).format(amount);
};

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const normalizePhone = (phone) => {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('254')) {
    // Already normalized
  } else if (cleaned.length === 9) {
    cleaned = '254' + cleaned;
  }
  return cleaned;
};

export { APP_CONFIG, firebaseConfig, formatCurrency, formatDate, normalizePhone };
