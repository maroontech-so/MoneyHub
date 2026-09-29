import { auth, db } from './firebase-init.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

/**
 * Register a new user
 */
export async function registerUser(userData) {
  // 1. Check if username exists
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '==', userData.username));
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    throw new Error('Username is already taken');
  }

  // 2. Create Auth User
  const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
  const user = userCredential.user;

  // 3. Create User Document
  const userDoc = {
    uid: user.uid,
    email: userData.email,
    username: userData.username,
    phone: userData.phone,
    displayName: userData.fullName,
    avatar: '',
    status: 'ACTIVE',
    accountState: 'VERIFIED', // Should ideally be pending until email/phone verify
    emailVerified: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
    referredBy: userData.referralCode || null,
    riskScore: 0,
    riskFlags: []
  };

  await setDoc(doc(db, 'users', user.uid), userDoc);
  
  // Profile Doc
  await setDoc(doc(db, 'userProfiles', user.uid), {
    bio: '',
    preferences: {}
  });

  // 4. Create Wallet Document (Zero trust on client - just initialize zeroes)
  // Actual initializations should be verified by backend, but we create the empty doc here.
  // Security rules prevent client from updating this later.
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

  // 5. Send Verification Email
  await sendEmailVerification(user);

  return user;
}

/**
 * Login with Email OR Username
 */
export async function loginUser(identifier, password) {
  let email = identifier;
  
  // If identifier doesn't look like an email, assume it's a username
  if (!identifier.includes('@')) {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', identifier.toLowerCase()));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('Invalid username or password');
    }
    email = querySnapshot.docs[0].data().email;
  }

  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  
  // Update last login
  await setDoc(doc(db, 'users', userCredential.user.uid), {
    lastLogin: serverTimestamp()
  }, { merge: true });

  return userCredential.user;
}

export async function logoutUser() {
  await signOut(auth);
  window.location.href = '/login.html';
}

export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    // Always succeed silently to prevent email enumeration
  } catch (error) {
    console.error(error);
  }
}

export function getCurrentUser() {
  return auth.currentUser;
}

export async function getUserProfile(uid) {
  const userDoc = await getDoc(doc(db, 'users', uid));
  return userDoc.exists() ? userDoc.data() : null;
}

export function setupAuthListener(callback) {
  return onAuthStateChanged(auth, callback);
}
