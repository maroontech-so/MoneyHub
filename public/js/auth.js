import { auth, db } from './firebase-init.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

/**
 * Register a new user with real Firebase Auth
 * Fresh accounts start from zero and require KES 5 activation
 */
export async function registerUser(userData) {
  if (!userData.email || !userData.password) {
    throw new Error('Email and password are required');
  }

  // 1. Create Auth User directly with Firebase Authentication
  const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
  const user = userCredential.user;

  // 2. Set Firebase Auth Display Name
  try {
    await updateProfile(user, { displayName: userData.fullName || userData.username });
  } catch (e) {
    console.warn('Could not update auth profile:', e.message);
  }

  // 3. Create User Document in Firestore
  const userDoc = {
    uid: user.uid,
    email: userData.email,
    username: userData.username || userData.email.split('@')[0],
    phone: userData.phone || '',
    displayName: userData.fullName || userData.username,
    status: 'PENDING_ACTIVATION',
    activated: false,
    activationFee: 5,
    emailVerified: user.emailVerified,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
    referredBy: userData.referralCode || null
  };

  try {
    await setDoc(doc(db, 'users', user.uid), userDoc);
    
    // Wallet doc starting at zero
    await setDoc(doc(db, 'wallets', user.uid), {
      userId: user.uid,
      availableBalance: 0,
      pendingBalance: 0,
      lifetimeEarned: 0,
      lifetimeWithdrawn: 0,
      currency: 'KES',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Firestore user doc sync deferred:', err.message);
  }

  // 4. Authoritatively sync with server
  try {
    await fetch('/api/auth/register-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: user.uid,
        email: userData.email,
        username: userData.username,
        phone: userData.phone,
        displayName: userData.fullName
      })
    });
  } catch (err) {
    console.warn('Server sync failed:', err.message);
  }

  // Store user in local cache for instant UI availability
  try {
    localStorage.setItem('earnwave_user_uid', user.uid);
    localStorage.setItem('earnwave_user_email', user.email);
    localStorage.setItem('earnwave_user_phone', userData.phone || '');
    localStorage.setItem('earnwave_user_status', 'PENDING_ACTIVATION');
  } catch(e) {}

  return user;
}

/**
 * Login with Email OR Username
 */
export async function loginUser(identifier, password) {
  let email = identifier.trim();
  
  // If not email format, construct or lookup email
  if (!email.includes('@')) {
    email = `${email.toLowerCase()}@earnwave.user`;
  }

  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  // Update last login
  try {
    await setDoc(doc(db, 'users', user.uid), {
      lastLogin: serverTimestamp()
    }, { merge: true });
  } catch(e) {}

  // Sync session with server
  try {
    await fetch('/api/auth/register-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      })
    });
  } catch(e) {}

  return user;
}

export async function logoutUser() {
  try {
    localStorage.removeItem('earnwave_user_uid');
    localStorage.removeItem('earnwave_user_email');
    localStorage.removeItem('earnwave_user_status');
    localStorage.removeItem('earnwave_prod_user');
  } catch(e) {}
  await signOut(auth);
  window.location.href = '/login.html';
}

export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error(error);
  }
}

export function getCurrentUser() {
  return auth.currentUser;
}

export async function getUserProfile(uid) {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data();
    }
  } catch(e) {}

  // Fallback to server API
  try {
    const res = await fetch('/api/auth/user-status', {
      headers: { 'x-user-id': uid }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.user) return data.user;
    }
  } catch(e) {}

  return null;
}

export async function checkUserActivation(uid) {
  try {
    const res = await fetch('/api/auth/user-status', {
      headers: { 'x-user-id': uid }
    });
    if (res.ok) {
      const data = await res.json();
      return Boolean(data.activated || data.status === 'ACTIVE');
    }
  } catch(e) {}
  return false;
}

export function setupAuthListener(callback) {
  return onAuthStateChanged(auth, callback);
}
