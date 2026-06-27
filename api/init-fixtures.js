// api/init-fixtures.js
//
// Seeds Firestore cache using Firebase REST API (no firebase-admin needed).
// Uses the same VITE_FIREBASE_PROJECT_ID env var already set.
// Must be called once after deploy: GET /api/init-fixtures?secret=...

import fixturesData from "../src/data/fixtures.json";

export default async function handler(req, res) {
  const secret = req.query.secret || (req.headers["authorization"] || "").replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    return res.status(500).json({ error: "VITE_FIREBASE_PROJECT_ID not set" });
  }

  // We use Firebase service account to get an access token, then REST API
  // But since we don't have easy auth here, let's use Firestore REST with API key
  // The Firestore REST API with API key works for writing if rules allow it.
  // Since our rules require auth, we'll use the Admin SDK approach but simpler:

  try {
    const { initializeApp, getApps, cert } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");

    if (!getApps().length) {
      const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
      if (!privateKey || !process.env.FIREBASE_CLIENT_EMAIL) {
        // If no admin creds, return helpful error
        return res.status(500).json({
          error: "Firebase Admin credentials not configured",
          hint: "Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in Vercel env vars",
          envCheck: {
            projectId: !!process.env.FIREBASE_PROJECT_ID,
            clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: !!process.env.FIREBASE_PRIVATE_KEY,
          }
        });
      }
      initializeApp({
        credential: cert({
          projectId:   process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
    }

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
    return res.status(500).json({
      error: err.message,
      code: err.code || "unknown",
    });
  }
}
