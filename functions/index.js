// functions/index.js
// Firebase Cloud Function: fetches live FIFA Rankings and proxies to frontend
// Deploy: firebase deploy --only functions

const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

// ─── Helper: fetch FIFA Rankings from official API ───────────────────────────
async function fetchFIFARankings() {
  const url =
    "https://api.fifa.com/api/v3/rankings/men?count=210&language=en";

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
    },
  });

  if (!res.ok) throw new Error(`FIFA API error: ${res.status}`);
  const json = await res.json();

  // FIFA API returns { Results: [ { RankingPosition, TeamName, Points, ... } ] }
  return (json.Results || []).map((r) => ({
    rank:     r.RankingPosition,
    id:       r.IdTeam,
    name:     r.TeamName?.[0]?.Description || r.IdTeam,
    points:   Math.round(r.Points),
    flag:     `https://digitalhub.fifa.com/transform/b9c3cfdd-2007-4011-ae7e-f8aab7a4da3f/${r.IdTeam}`,
    updated:  new Date().toISOString(),
  }));
}

// ─── HTTP endpoint: GET /fifaRankings ────────────────────────────────────────
// Called by the React frontend — returns cached Firestore data
exports.fifaRankings = onRequest(
  { cors: true, region: "us-central1" },
  async (req, res) => {
    try {
      const snap = await db.collection("cache").doc("fifaRankings").get();

      if (snap.exists) {
        const data = snap.data();
        return res.json({
          rankings: data.rankings,
          updated:  data.updatedAt?.toDate?.()?.toISOString() || null,
          source:   "cache",
        });
      }

      // Cache miss — fetch fresh
      const rankings = await fetchFIFARankings();
      await db.collection("cache").doc("fifaRankings").set({
        rankings,
        updatedAt: new Date(),
      });

      return res.json({ rankings, updated: new Date().toISOString(), source: "live" });
    } catch (err) {
      console.error("fifaRankings error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
);

// ─── Scheduled: refresh FIFA Rankings every 24h ──────────────────────────────
exports.refreshFIFARankings = onSchedule(
  { schedule: "every 24 hours", region: "us-central1" },
  async () => {
    try {
      const rankings = await fetchFIFARankings();
      await db.collection("cache").doc("fifaRankings").set({
        rankings,
        updatedAt: new Date(),
      });
      console.log(`Refreshed FIFA rankings: ${rankings.length} teams`);
    } catch (err) {
      console.error("Refresh error:", err);
    }
  }
);
