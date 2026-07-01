// api/calculate-scores.js — Updated with new scoring rules

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

// ── New scoring rules ─────────────────────────────────────────────
// 10 pts — exact scoreline
// 7 pts  — correct goal difference (e.g. predicted 2-0, actual 3-1)
// 5 pts  — correct winner/loser/draw
// 2 pts  — wrong prediction (participation points)
function calculatePoints(predA, predB, actualA, actualB) {
  if (predA === actualA && predB === actualB) return 10;
  const predDiff   = predA - predB;
  const actualDiff = actualA - actualB;
  if (predDiff === actualDiff) return 7;
  const predOutcome   = predDiff > 0 ? "W" : predDiff < 0 ? "L" : "D";
  const actualOutcome = actualDiff > 0 ? "W" : actualDiff < 0 ? "L" : "D";
  if (predOutcome === actualOutcome) return 5;
  return 2;
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

      for (const docRef of snap.docs) {
        const pred   = docRef.data();
        const result = finishedMatches[matchId];
        const pts    = calculatePoints(pred.scoreA, pred.scoreB, result.scoreA, result.scoreB);

        await docRef.ref.update({
          scored:        true,
          pointsAwarded: pts,
          pointsBreakdown: {
            predA: pred.scoreA, predB: pred.scoreB,
            actualA: result.scoreA, actualB: result.scoreB,
          },
        });

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
      message:           "Scoring complete",
      matchesProcessed:  matchIds.length,
      predictionsScored: scoredCount,
      usersUpdated:      Object.keys(userPointsDelta).length,
      scoringRules:      { exact: 10, goalDiff: 7, outcome: 5, wrong: 2 },
      timestamp:         new Date().toISOString(),
    });
  } catch (err) {
    console.error("Scoring error:", err);
    return res.status(500).json({ error: err.message });
  }
}
