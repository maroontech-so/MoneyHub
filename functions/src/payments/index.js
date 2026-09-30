@@
     } else if (purpose === 'ACTIVATION') {
         // Activate user account
         const userRef = db.collection('users').doc(userId);
         transaction.update(userRef, {
             status: 'ACTIVE',
+            activated: true,
             activatedAt: new Date(),
             updatedAt: new Date()
         });
