// api/sync-results.js
//
// Vercel Serverless Function — runs every day via Cron Job
// Fetches latest WC2026 match results from free public APIs and
// updates Firestore with real scores automatically.
//
// No API key needed — uses worldcup26.ir (primary) with
// wcup2026.org as fallback.

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

// ── Try worldcup26.ir ──────────────────────────────────────────────
async function fetchFromWorldcup26ir() {
  const res = await fetch("https://worldcup26.ir/get/games", {
    headers: { "Accept": "application/json", "User-Agent": "WC2026-App/1.0" },
  });
  if (!res.ok) throw new Error(`worldcup26.ir returned ${res.status}`);
  const data = await res.json();
  // Shape: [{homeTeam, awayTeam, homeScore, awayScore, status, date, ...}]
  const games = Array.isArray(data) ? data : (data.games || data.matches || []);
  if (!games.length) throw new Error("worldcup26.ir returned empty array");
  return games.map(g => ({
    home: g.homeTeam?.name || g.home_team || g.teamA,
    away: g.awayTeam?.name || g.away_team || g.teamB,
    homeScore: g.homeScore ?? g.home_score ?? g.scoreA ?? null,
    awayScore: g.awayScore ?? g.away_score ?? g.scoreB ?? null,
    status: g.status || (g.homeScore !== null ? "finished" : "scheduled"),
    date: g.date || g.kickoff || g.matchDate,
  }));
}

// ── Try wcup2026.org ───────────────────────────────────────────────
async function fetchFromWcup2026org() {
  const res = await fetch("https://wcup2026.org/api/data.php?action=standings", {
    headers: { "Accept": "application/json", "User-Agent": "WC2026-App/1.0" },
  });
  if (!res.ok) throw new Error(`wcup2026.org returned ${res.status}`);
  const data = await res.json();
  const matches = data.matches || data.fixtures || [];
  if (!matches.length) throw new Error("wcup2026.org returned empty array");
  return matches.map(g => ({
    home: g.home_team || g.teamA || g.home,
    away: g.away_team || g.teamB || g.away,
    homeScore: g.home_score ?? g.scoreA ?? null,
    awayScore: g.away_score ?? g.scoreB ?? null,
    status: g.status || (g.home_score !== null ? "finished" : "scheduled"),
    date: g.date || g.kickoff,
  }));
}

// ── Match our fixture IDs to the external API data ─────────────────
function normalizeTeamName(name = "") {
  return name
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace("unitedstates", "usa")
    .replace("drcongodemocratic", "drcongo")
    .replace("ivorycoast", "côtedivoire")
    .replace("costarica", "costarica")
    .replace("newzealand", "newzealand");
}

function matchFixture(fixture, externalGames) {
  const homeKey = normalizeTeamName(fixture.team_a_name);
  const awayKey = normalizeTeamName(fixture.team_b_name);
  return externalGames.find(g => {
    const gHome = normalizeTeamName(g.home);
    const gAway = normalizeTeamName(g.away);
    return (gHome === homeKey && gAway === awayKey) ||
           (gHome === awayKey && gAway === homeKey);
  });
}

// ── Main handler ───────────────────────────────────────────────────
export default async function handler(req, res) {
  // Secure with CRON_SECRET (set in Vercel env vars)
  const authHeader = req.headers["authorization"];
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    getAdminApp();
    const db = getFirestore();

    // 1. Load our internal fixtures from Firestore cache
    const fixturesSnap = await db.collection("cache").doc("fixtures").get();
    const fixtures = fixturesSnap.exists
      ? fixturesSnap.data().fixtures
      : [];

    if (!fixtures.length) {
      return res.status(200).json({ message: "No fixtures in cache yet — skipping sync", updated: 0 });
    }

    // 2. Fetch external results with fallback
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
      return res.status(200).json({ message: "All external APIs unavailable", source: "none", updated: 0 });
    }

    // 3. Update fixtures with real scores
    let updatedCount = 0;
    const updatedFixtures = fixtures.map(fixture => {
      if (fixture.status === "finished") return fixture; // already done, skip

      const match = matchFixture(fixture, externalGames);
      if (!match) return fixture;

      const isFinished = match.status === "finished" ||
        (match.homeScore !== null && match.awayScore !== null);

      if (!isFinished) return fixture;

      updatedCount++;
      // Handle reversed home/away
      const homeKey = normalizeTeamName(fixture.team_a_name);
      const reversed = normalizeTeamName(match.home) !== homeKey;

      return {
        ...fixture,
        status: "finished",
        score_a: reversed ? match.awayScore : match.homeScore,
        score_b: reversed ? match.homeScore : match.awayScore,
      };
    });

    // 4. Save back to Firestore cache
    await db.collection("cache").doc("fixtures").set({
      fixtures: updatedFixtures,
      lastSynced: new Date().toISOString(),
      source,
    });

    return res.status(200).json({
      message: "Sync complete",
      source,
      totalFixtures: fixtures.length,
      updatedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("sync-results error:", err);
    return res.status(500).json({ error: err.message });
  }
}
