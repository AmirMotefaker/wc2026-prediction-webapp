// api/sync-results.js
// Syncs WC2026 results from wcup2026.org (free, no API key, live results)
// Fallback: openfootball/worldcup.json on GitHub

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

function norm(name = "") {
  return name.toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace("unitedstates", "usa")
    .replace("democraticrepublicofcongo", "drcongo")
    .replace("ivorycoast", "cotedivoire")
    .replace("cotedivoire", "cotedivoire")
    .replace("bosniaandherzegovina", "bosnia")
    .replace("bosniaherzegovina", "bosnia")
    .replace("czechrepublic", "czechia")
    .replace("southkorea", "korea")
    .replace("korearepublic", "korea")
    .replace("curaçao", "curacao");
}

// ── Primary: wcup2026.org JSON API ───────────────────────────────────────────
async function fetchWcup2026org() {
  const res = await fetch("https://wcup2026.org/api/data.php", {
    headers: { "Accept": "application/json", "User-Agent": "WC2026-Predictor/1.0" },
  });
  if (!res.ok) throw new Error(`wcup2026.org returned ${res.status}`);
  const data = await res.json();

  // Try multiple possible response shapes
  const matches = data.matches || data.fixtures || data.games || (Array.isArray(data) ? data : []);
  if (!matches.length) throw new Error("wcup2026.org returned no matches");

  return matches.map(m => ({
    home:      m.home_team || m.teamA || m.home || m.team1 || "",
    away:      m.away_team || m.teamB || m.away || m.team2 || "",
    homeScore: m.home_score ?? m.scoreA ?? m.score1 ?? null,
    awayScore: m.away_score ?? m.scoreB ?? m.score2 ?? null,
    status:    m.status || (m.home_score !== null && m.home_score !== undefined ? "finished" : "scheduled"),
  }));
}

// ── Fallback: openfootball GitHub raw JSON ────────────────────────────────────
async function fetchOpenfootball() {
  const res = await fetch(
    "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json",
    { headers: { "User-Agent": "WC2026-Predictor/1.0" }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`openfootball returned ${res.status}`);
  const data = await res.json();

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
      });
    }
  }
  if (!matches.length) throw new Error("openfootball returned no matches");
  return matches;
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

    const cacheSnap = await db.collection("cache").doc("fixtures").get();
    const fixtures = cacheSnap.exists ? (cacheSnap.data().fixtures || []) : [];
    if (!fixtures.length) {
      return res.status(200).json({ message: "No fixtures — run /api/init-fixtures first", updated: 0 });
    }

    // Try sources in order
    let externalGames = [];
    let source = "none";
    const errors = [];

    for (const [name, fn] of [["wcup2026.org", fetchWcup2026org], ["openfootball", fetchOpenfootball]]) {
      try {
        externalGames = await fn();
        source = name;
        break;
      } catch (e) {
        errors.push(`${name}: ${e.message}`);
        console.warn(`${name} failed:`, e.message);
      }
    }

    if (!externalGames.length) {
      return res.status(200).json({
        message: "All sources unavailable",
        errors, updated: 0,
      });
    }

    // Update fixtures
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
      externalMatchesFound: externalGames.length,
      timestamp:     new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
