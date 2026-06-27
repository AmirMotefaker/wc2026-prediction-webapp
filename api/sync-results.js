// api/sync-results.js
// Auto-syncs WC2026 results from openfootball/worldcup.json (free, no API key)
// Runs daily via Vercel Cron. Updates Firestore cache used by the React app.

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

// ── Name normalization for fuzzy matching ─────────────────────────────────────
function norm(name = "") {
  return name.toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace("unitedstates", "usa")
    .replace("usamerica", "usa")
    .replace("democraticrepublicofcongo", "drcongo")
    .replace("drcongo", "drcongo")
    .replace("costarica", "costarica")
    .replace("newzealand", "newzealand")
    .replace("bosniaandherzegovina", "bosnia")
    .replace("bosniaherzegovina", "bosnia")
    .replace("ivorycoast", "cotedivoire")
    .replace("coteivoire", "cotedivoire")
    .replace("capeverde", "capeverde")
    .replace("saudiarabia", "saudiarabia")
    .replace("southkorea", "korea")
    .replace("korearepublic", "korea")
    .replace("czechia", "czechia")
    .replace("czechrepublic", "czechia");
}

// ── Fetch from openfootball (primary, free, no key) ───────────────────────────
async function fetchOpenfootball() {
  const url = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";
  const res = await fetch(url, {
    headers: { "User-Agent": "WC2026-Predictor/1.0" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`openfootball returned ${res.status}`);
  const data = await res.json();

  // openfootball format: { "rounds": [ { "matches": [ { "team1": {"name": "..."}, "team2": {...}, "score": {"ft": [2,0]}, ... } ] } ] }
  const matches = [];
  for (const round of (data.rounds || [])) {
    for (const m of (round.matches || [])) {
      const ft = m.score?.ft;
      const finished = Array.isArray(ft) && ft.length === 2;
      matches.push({
        home:      m.team1?.name || m.team1?.code || "",
        away:      m.team2?.name || m.team2?.code || "",
        homeScore: finished ? ft[0] : null,
        awayScore: finished ? ft[1] : null,
        status:    finished ? "finished" : "scheduled",
        date:      m.date || "",
      });
    }
  }
  if (!matches.length) throw new Error("openfootball returned no matches");
  return matches;
}

// ── Fetch from worldcup26.ir (fallback) ──────────────────────────────────────
async function fetchWorldcup26ir() {
  const res = await fetch("https://worldcup26.ir/get/games", {
    headers: { "Accept": "application/json", "User-Agent": "WC2026-Predictor/1.0" },
  });
  if (!res.ok) throw new Error(`worldcup26.ir returned ${res.status}`);
  const data = await res.json();
  const games = Array.isArray(data) ? data : (data.games || data.matches || []);
  if (!games.length) throw new Error("worldcup26.ir empty");
  return games.map(g => ({
    home:      g.homeTeam?.name || g.home_team || g.teamA || g.home || "",
    away:      g.awayTeam?.name || g.away_team || g.teamB || g.away || "",
    homeScore: g.homeScore ?? g.home_score ?? g.scoreA ?? null,
    awayScore: g.awayScore ?? g.away_score ?? g.scoreB ?? null,
    status:    g.status || (g.homeScore !== null ? "finished" : "scheduled"),
  }));
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const authHeader = req.headers["authorization"];
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    getAdminApp();
    const db = getFirestore();

    // Load fixtures from Firestore
    const cacheSnap = await db.collection("cache").doc("fixtures").get();
    const fixtures = cacheSnap.exists ? (cacheSnap.data().fixtures || []) : [];
    if (!fixtures.length) {
      return res.status(200).json({ message: "No fixtures in cache — run /api/init-fixtures first", updated: 0 });
    }

    // Fetch external results
    let externalGames = [];
    let source = "none";
    try {
      externalGames = await fetchOpenfootball();
      source = "openfootball";
    } catch (e1) {
      console.warn("openfootball failed:", e1.message);
      try {
        externalGames = await fetchWorldcup26ir();
        source = "worldcup26.ir";
      } catch (e2) {
        console.warn("worldcup26.ir failed:", e2.message);
      }
    }

    if (!externalGames.length) {
      return res.status(200).json({ message: "All external APIs unavailable", updated: 0 });
    }

    // Match and update
    let updatedCount = 0;
    const updatedFixtures = fixtures.map(fixture => {
      if (fixture.status === "finished") return fixture;

      const homeKey = norm(fixture.team_a_name);
      const awayKey = norm(fixture.team_b_name);

      const match = externalGames.find(g => {
        const gH = norm(g.home);
        const gA = norm(g.away);
        return (gH === homeKey && gA === awayKey) ||
               (gH === awayKey && gA === homeKey);
      });

      if (!match || match.status !== "finished") return fixture;
      if (match.homeScore === null || match.awayScore === null) return fixture;

      updatedCount++;
      const reversed = norm(match.home) !== homeKey;
      return {
        ...fixture,
        status:  "finished",
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
      message:       "Sync complete",
      source,
      totalFixtures: fixtures.length,
      newlyUpdated:  updatedCount,
      totalFinished: updatedFixtures.filter(f => f.status === "finished").length,
      timestamp:     new Date().toISOString(),
    });
  } catch (err) {
    console.error("sync-results error:", err);
    return res.status(500).json({ error: err.message });
  }
}
