// api/init-fixtures.js
//
// ONE-TIME setup endpoint: loads fixtures from local JSON and saves
// them to Firestore cache so sync-results.js can work properly.
// Call once after deploy: GET /api/init-fixtures?secret=YOUR_CRON_SECRET

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fixturesData from "../src/data/fixtures.json";

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
  const secret = req.query.secret || req.headers["authorization"]?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    getAdminApp();
    const db = getFirestore();

    await db.collection("cache").doc("fixtures").set({
      fixtures:   fixturesData.fixtures,
      lastSynced: new Date().toISOString(),
      source:     "local-init",
    });

    return res.status(200).json({
      message:  "Fixtures initialized in Firestore cache",
      count:    fixturesData.fixtures.length,
      finished: fixturesData.fixtures.filter(f => f.status === "finished").length,
    });
  } catch (err) {
    console.error("init-fixtures error:", err);
    return res.status(500).json({ error: err.message });
  }
}
