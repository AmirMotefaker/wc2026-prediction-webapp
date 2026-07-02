// api/init-fixtures.js
// Seeds Firestore using firebase-admin with createRequire fix

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const fixturesData = require("../src/data/fixtures.json");

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  return initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

export default async function handler(req, res) {
  const secret = req.query.secret || (req.headers["authorization"] || "").replace("Bearer ", "");

  try {
    getAdminApp();
    const db = getFirestore();

    await db.collection("cache").doc("fixtures").set({
      fixtures:   fixturesData.fixtures,
      lastSynced: new Date().toISOString(),
      source:     "local-init",
    });

    return res.status(200).json({
      message:  "OK",
      count:    fixturesData.fixtures.length,
      finished: fixturesData.fixtures.filter(f => f.status === "finished").length,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack?.slice(0, 300) });
  }
}
