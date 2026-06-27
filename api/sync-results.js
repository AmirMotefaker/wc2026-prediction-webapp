// api/sync-results.js
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const fixturesData = require("../src/data/fixtures.json");

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

function normalizeTeamName(name = "") {
  return name.toLowerCase().replace(/[^a-z]/g, "")
    .replace("unitedstates", "usa")
    .replace("drcongodemocratic", "drcongo")
    .replace("côtedivoire", "ivorycoast");
}

async function fetchFromWorldcup26ir() {
  const res = await fetch("https://worldcup26.ir/get/games", {
    headers: { "Accept": "application/json", "User-Agent": "WC2026-App/1.0" },
  });
  if (!res.ok) throw new Error(`worldcup26.ir returned ${res.status}`);
  const data = await res.json();
  const games = Array.isArray(data) ? data : (data.games || data.matches || []);
  if (!games.length) throw new Error("worldcup26.ir returned empty array");
  return games.map(g => ({
    home: g.homeTeam?.name || g.home_team || g.teamA || g.home || "",
    away: g.awayTeam?.name || g.away_team || g.teamB || g.away || "",
    homeScore: g.homeScore ?? g.home_score ?? g.scoreA ?? null,
    awayScore: g.awayScore ?? g.away_score ?? g.scoreB ?? null,
    status: g.status || (g.homeScore !== null ? "finished" : "scheduled"),
  }));
}

async function fetchFromWcup2026org() {
  const res = await fetch("https://wcup2026.org/api/data.php?action=matches", {
    headers: { "Accept": "application/json", "User-Agent": "WC2026-App/1.0" },
  });
  if (!res.ok) throw new Error(`wcup2026.org returned ${res.status}`);
  const data = await res.json();
  const matches = data.matches || data.fixtures || data || [];
  if (!Array.isArray(matches) || !matches.length) throw new Error("wcup2026.org returned empty");
  return matches.map(g => ({
    home: g.home_team || g.teamA || g.home || "",
    away: g.away_team || g.teamB || g.away || "",
    homeScore: g.home_score ?? g.scoreA ?? null,
    awayScore: g.away_score ?? g.scoreB ?? null,
    status: g.status || (g.home_score !== null ? "finished" : "scheduled"),
  }));
}

export default async function handler(req, res) {
  const authHeader = req.headers["authorization"];
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    getAdminApp();
    const db = getFirestore();

    // Load from Firestore cache, fall back to local fixtures.json
    const fixturesSnap = await db.collection("cache").doc("fixtures").get();
    let fixtures = fixturesSnap.exists
      ? (fixturesSnap.data().fixtures || [])
      : fixturesData.fixtures;

    if (!fixtures.length) {
      fixtures = fixturesData.fixtures;
    }

    // Fetch external results
    let externalGames = [];
    let source = "none";
    try {
      externalGames = await fetchFromWorldcup26ir();
      source = "worldcup26.ir";
    } catch (e1) {
      console.warn("Primary API failed:", e1.message);
      try {
        externalGames = await fetchFromWcup2026org();
        source = "wcup2026.org";
      } catch (e2) {
        console.warn("Fallback API failed:", e2.message);
      }
    }

    if (!externalGames.length) {
      return res.status(200).json({
        message: "All external APIs unavailable — keeping existing data",
        source: "none", updated: 0
      });
    }

    let updatedCount = 0;
    const updatedFixtures = fixtures.map(fixture => {
      if (fixture.status === "finished") return fixture;

      const homeKey = normalizeTeamName(fixture.team_a_name);
      const awayKey = normalizeTeamName(fixture.team_b_name);

      const match = externalGames.find(g => {
        const gHome = normalizeTeamName(g.home);
        const gAway = normalizeTeamName(g.away);
        return (gHome === homeKey && gAway === awayKey) ||
               (gHome === awayKey && gAway === homeKey);
      });

      if (!match) return fixture;
      const isFinished = match.status === "finished" ||
        (match.homeScore !== null && match.awayScore !== null);
      if (!isFinished) return fixture;

      updatedCount++;
      const reversed = normalizeTeamName(match.home) !== homeKey;
      return {
        ...fixture,
        status: "finished",
        score_a: reversed ? match.awayScore : match.homeScore,
        score_b: reversed ? match.homeScore : match.awayScore,
      };
    });

    await db.collection("cache").doc("fixtures").set({
      fixtures: updatedFixtures,
      lastSynced: new Date().toISOString(),
      source,
    });

    return res.status(200).json({
      message: "Sync complete",
      source, totalFixtures: fixtures.length,
      updatedCount, timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("sync-results error:", err);
    return res.status(500).json({ error: err.message });
  }
}
