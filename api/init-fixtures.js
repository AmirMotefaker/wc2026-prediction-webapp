// api/init-fixtures.js
// Seeds Firestore cache using REST API — no firebase-admin needed.

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const fixturesData = require("../src/data/fixtures.json");

export default async function handler(req, res) {
  const secret = req.query.secret || (req.headers["authorization"] || "").replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const apiKey    = process.env.VITE_FIREBASE_API_KEY;
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;

  if (!apiKey || !projectId) {
    return res.status(500).json({
      error: "Missing env vars",
      hasApiKey: !!apiKey,
      hasProjectId: !!projectId,
    });
  }

  try {
    // Sign in anonymously to get auth token
    const signInRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInAnonymously?key=${apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
    );
    if (!signInRes.ok) {
      const err = await signInRes.text();
      return res.status(500).json({ error: "Anonymous sign-in failed", detail: err });
    }
    const { idToken } = await signInRes.json();

    // Convert fixtures to Firestore REST format
    const firestoreDoc = {
      fields: {
        lastSynced: { stringValue: new Date().toISOString() },
        source:     { stringValue: "local-init" },
        fixtures: {
          arrayValue: {
            values: fixturesData.fixtures.map(f => ({
              mapValue: {
                fields: {
                  match_id:     { stringValue: String(f.match_id || "") },
                  group:        { stringValue: String(f.group || "") },
                  matchday:     { integerValue: String(f.matchday || 0) },
                  team_a:       { stringValue: String(f.team_a || "") },
                  team_a_name:  { stringValue: String(f.team_a_name || "") },
                  team_b:       { stringValue: String(f.team_b || "") },
                  team_b_name:  { stringValue: String(f.team_b_name || "") },
                  venue:        { stringValue: String(f.venue || "") },
                  venue_name:   { stringValue: String(f.venue_name || "") },
                  city:         { stringValue: String(f.city || "") },
                  date:         { stringValue: String(f.date || "") },
                  kickoff_utc:  { stringValue: String(f.kickoff_utc || "") },
                  kickoff_local:{ stringValue: String(f.kickoff_local || "") },
                  kickoff_tehran: { stringValue: String(f.kickoff_tehran || "") },
                  kickoff_tehran_day_offset: { integerValue: String(f.kickoff_tehran_day_offset || 0) },
                  stage:        { stringValue: String(f.stage || "group") },
                  status:       { stringValue: String(f.status || "scheduled") },
                  score_a: f.score_a !== null && f.score_a !== undefined
                    ? { integerValue: String(f.score_a) }
                    : { nullValue: null },
                  score_b: f.score_b !== null && f.score_b !== undefined
                    ? { integerValue: String(f.score_b) }
                    : { nullValue: null },
                }
              }
            }))
          }
        }
      }
    };

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/cache/fixtures`;
    const writeRes = await fetch(firestoreUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify(firestoreDoc),
    });

    if (!writeRes.ok) {
      const errText = await writeRes.text();
      return res.status(500).json({ error: "Firestore write failed", detail: errText.slice(0, 500) });
    }

    return res.status(200).json({
      message:  "Fixtures initialized in Firestore",
      count:    fixturesData.fixtures.length,
      finished: fixturesData.fixtures.filter(f => f.status === "finished").length,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
