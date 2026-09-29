const functions = require('firebase-functions');
const admin = require('firebase-admin');

// ------------------------------------------
// leaderboard/index.js
// ------------------------------------------

exports.updateLeaderboard = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
    const db = admin.firestore();
    
    // In a real production system, you would calculate these over time windows.
    // For this prototype, we'll just pull the top users by `totalEarned` from the wallet collection for ALL_TIME,
    // and we'd calculate DAILY/WEEKLY/MONTHLY based on transaction history.
    
    console.log("Starting leaderboard update...");

    try {
        // ALL TIME
        const walletsSnap = await db.collection('wallets')
            .orderBy('totalEarned', 'desc')
            .limit(100)
            .get();

        const allTimeEntries = [];
        for (let i = 0; i < walletsSnap.docs.length; i++) {
            const doc = walletsSnap.docs[i];
            const data = doc.data();
            
            // Get user info
            const userDoc = await db.collection('users').doc(doc.id).get();
            const userData = userDoc.exists ? userDoc.data() : { username: 'Unknown' };

            // Check privacy settings
            if (userData.settings && userData.settings.showInLeaderboard === false) {
                continue;
            }

            allTimeEntries.push({
                userId: doc.id,
                username: userData.username,
                avatar: userData.avatarUrl || null,
                verifiedEarnings: data.totalEarned || 0,
                period: 'allTime',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                // Simplification: rank change is not calculated dynamically here for brevity
                rankChange: 0 
            });
        }

        // Batch write entries
        const batch = db.batch();
        
        // Clear old entries
        const oldEntries = await db.collection('leaderboardEntries').where('period', '==', 'allTime').get();
        oldEntries.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Write new entries
        allTimeEntries.forEach(entry => {
            const ref = db.collection('leaderboardEntries').doc();
            batch.set(ref, entry);
        });

        await batch.commit();
        console.log("Leaderboard updated successfully.");

    } catch (error) {
        console.error("Error updating leaderboard:", error);
    }
    return null;
});
