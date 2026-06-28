// api/debug-sync.js - check what's in Firestore for group H
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

export default async function handler(req, res) {
  try {
    getAdminApp();
    const db = getFirestore();
    const snap = await db.collection("cache").doc("fixtures").get();
    if (!snap.exists) return res.status(200).json({ error: "No cache document" });

    const data = snap.data();
    const groupH = (data.fixtures || []).filter(f => f.group === "H");
    const groupE = (data.fixtures || []).filter(f => f.group === "E");

    return res.status(200).json({
      lastSynced: data.lastSynced,
      source: data.source,
      totalFixtures: (data.fixtures || []).length,
      groupH: groupH.map(f => ({
        id: f.match_id, md: f.matchday,
        teams: `${f.team_a_name} vs ${f.team_b_name}`,
        status: f.status, score: `${f.score_a}-${f.score_b}`
      })),
      groupE: groupE.map(f => ({
        id: f.match_id, md: f.matchday,
        teams: `${f.team_a_name} vs ${f.team_b_name}`,
        status: f.status, score: `${f.score_a}-${f.score_b}`
      })),
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
