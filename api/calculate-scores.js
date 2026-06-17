// api/calculate-scores.js
//
// Vercel Serverless Function - triggered by Vercel Cron every few hours.
// Compares all saved predictions against finished match results,
// awards points, and updates each user's totalPoints in Firestore.
//
// Scoring rules:
//   Exact scoreline match      = 3 points
//   Correct outcome (W/D/L)    = 1 point
//   Wrong outcome               = 0 points
//
// Only matches with status "finished" and a result are scored.
// Each prediction is scored once (tracked via a "scored" flag) to
// avoid double-counting on repeated cron runs.

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fixturesData from "../src/data/fixtures.json";

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  return initializeApp({
    credential: cert({
      projectId:  process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

function outcome(scoreA, scoreB) {
  if (scoreA > scoreB) return "A";
  if (scoreA < scoreB) return "B";
  return "D";
}

function pointsFor(prediction, result) {
  if (prediction.scoreA === result.scoreA && prediction.scoreB === result.scoreB) {
    return 3; // exact score
  }
  if (outcome(prediction.scoreA, prediction.scoreB) === outcome(result.scoreA, result.scoreB)) {
    return 1; // correct outcome only
  }
  return 0;
}

export default async function handler(req, res) {
  // Allow only Vercel Cron (or manual trigger with secret) to call this
  const authHeader = req.headers["authorization"];
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    getAdminApp();
    const db = getFirestore();

    // Build a lookup of finished matches with results
    const finishedMatches = {};
    for (const f of fixturesData.fixtures) {
      if (f.status === "finished" && f.score_a !== null && f.score_b !== null) {
        finishedMatches[f.match_id] = { scoreA: f.score_a, scoreB: f.score_b };
      }
    }

    const matchIds = Object.keys(finishedMatches);
    if (matchIds.length === 0) {
      return res.status(200).json({ message: "No finished matches to score yet.", scored: 0 });
    }

    // Fetch all predictions for finished matches that haven't been scored yet
    const predictionsRef = db.collection("predictions");
    let scoredCount = 0;
    const userPointsDelta = {}; // uid -> points to add

    for (const matchId of matchIds) {
      const snap = await predictionsRef
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

    // Apply point deltas to each user's totalPoints
    const usersRef = db.collection("users");
    for (const [uid, delta] of Object.entries(userPointsDelta)) {
      const userDoc = await usersRef.doc(uid).get();
      const current = userDoc.exists ? (userDoc.data().totalPoints || 0) : 0;
      await usersRef.doc(uid).set(
        { totalPoints: current + delta },
        { merge: true }
      );
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
