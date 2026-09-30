@@
 export async function checkUserActivation(uid) {
+  // Prefer the user's Firestore doc so the app sees activation immediately
+  // without waiting for a server round-trip.
   try {
-    const res = await fetch('/api/auth/user-status', {
-      headers: { 'x-user-id': uid }
-    });
-    if (res.ok) {
-      const data = await res.json();
-      return Boolean(data.activated || data.status === 'ACTIVE');
+    const userDoc = await getDoc(doc(db, 'users', uid));
+    if (userDoc.exists()) {
+      const data = userDoc.data();
+      if (data.activated === true || (data.status && data.status.toUpperCase() === 'ACTIVE')) {
+        return true;
+      }
     }
-  } catch(e) {}
+  } catch (e) {
+    console.warn('Firestore activation check failed:', e && e.message);
+  }
+
+  try {
+    const res = await fetch('/api/auth/user-status', {
+      headers: { 'x-user-id': uid }
+    });
+    if (res.ok) {
+      const data = await res.json();
+      return Boolean(data.activated || data.status === 'ACTIVE');
+    }
+  } catch (e) {
+    console.warn('Server activation check failed:', e && e.message);
+  }
   return false;
 }
