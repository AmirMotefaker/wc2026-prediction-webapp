// api/calculate-scores.js
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}

function outcome(a, b) { return a > b ? "A" : a < b ? "B" : "D"; }
function pointsFor(pred, result) {
  if (pred.scoreA === result.scoreA && pred.scoreB === result.scoreB) return 3;
  if (outcome(pred.scoreA, pred.scoreB) === outcome(result.scoreA, result.scoreB)) return 1;
  return 0;
}

export default async function handler(req, res) {
  const authHeader = req.headers["authorization"];
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    getAdminApp();
    const db = getFirestore();

    // Get finished matches from Firestore cache
    const cacheSnap = await db.collection("cache").doc("fixtures").get();
    const allFixtures = cacheSnap.exists ? (cacheSnap.data().fixtures || []) : [];
    const finishedMatches = {};
    for (const f of allFixtures) {
      if (f.status === "finished" && f.score_a !== null && f.score_b !== null) {
        finishedMatches[f.match_id] = { scoreA: f.score_a, scoreB: f.score_b };
      }
    }

    const matchIds = Object.keys(finishedMatches);
    if (!matchIds.length) {
      return res.status(200).json({ message: "No finished matches to score yet.", scored: 0 });
    }

    let scoredCount = 0;
    const userPointsDelta = {};

    for (const matchId of matchIds) {
      const snap = await db.collection("predictions")
        .where("matchId", "==", matchId)
        .where("scored", "==", false)
        .get();

      for (const doc of snap.docs) {
        const pred = doc.data();
        const result = finishedMatches[matchId];
        const pts = pointsFor(pred, result);
        await doc.ref.update({ scored: true, pointsAwarded: pts });
        userPointsDelta[pred.uid] = (userPointsDelta[pred.uid] || 0) + pts;
        scoredCount++;
      }
    }

    const usersRef = db.collection("users");
    for (const [uid, delta] of Object.entries(userPointsDelta)) {
      const userDoc = await usersRef.doc(uid).get();
      const current = userDoc.exists ? (userDoc.data().totalPoints || 0) : 0;
      await usersRef.doc(uid).set({ totalPoints: current + delta }, { merge: true });
    }

    return res.status(200).json({
      message: "Scoring complete",
      matchesProcessed: matchIds.length,
      predictionsScored: scoredCount,
      usersUpdated: Object.keys(userPointsDelta).length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Scoring error:", err);
    return res.status(500).json({ error: err.message });
  }
}
