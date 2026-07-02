// api/sync-results.js
// Syncs ALL WC2026 results from wcup2026.org

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
  return name.toLowerCase().replace(/[^a-z]/g, "")
    .replace("unitedstates", "usa")
    .replace("democraticrepublicofcongo", "drcongo")
    .replace("ivorycoast", "cotedivoire")
    .replace("bosniaandherzegovina", "bosnia")
    .replace("bosniaherzegovina", "bosnia")
    .replace("czechrepublic", "czechia")
    .replace("southkorea", "korea")
    .replace("korearepublic", "korea")
    .replace("türkiye", "turkiye")
    .replace("turkey", "turkiye")
    .replace("curaçao", "curacao");
}

async function fetchAllMatches() {
  // wcup2026.org supports ?action=all to get all matches
  const endpoints = [
    "https://wcup2026.org/api/data.php?action=all",
    "https://wcup2026.org/api/data.php?action=results",
    "https://wcup2026.org/api/data.php",
  ];

  let allMatches = [];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { "Accept": "application/json", "User-Agent": "WC2026-Predictor/1.0" },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const matches = data.matches || data.fixtures || (Array.isArray(data) ? data : []);
      if (matches.length > allMatches.length) {
        allMatches = matches;
      }
    } catch(e) {
      console.warn(`${url} failed:`, e.message);
    }
  }

  return allMatches.map(m => ({
    home:      m.team1 || m.home_team || m.home || "",
    away:      m.team2 || m.away_team || m.away || "",
    homeScore: Array.isArray(m.score) ? m.score[0] : (m.home_score ?? m.scoreA ?? null),
    awayScore: Array.isArray(m.score) ? m.score[1] : (m.away_score ?? m.scoreB ?? null),
    status:    m.status || "scheduled",
  }));
}

export default async function handler(req, res) {

  try {
    getAdminApp();
    const db = getFirestore();

    const cacheSnap = await db.collection("cache").doc("fixtures").get();
    const fixtures = cacheSnap.exists ? (cacheSnap.data().fixtures || []) : [];
    if (!fixtures.length) {
      return res.status(200).json({ message: "No fixtures — run /api/init-fixtures first", updated: 0 });
    }

    const externalGames = await fetchAllMatches();

    if (!externalGames.length) {
      return res.status(200).json({ message: "No external data available", updated: 0 });
    }

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
      fixtures:   updatedFixtures,
      lastSynced: new Date().toISOString(),
      source:     "wcup2026.org",
    });

    return res.status(200).json({
      message:              "Sync complete",
      source:               "wcup2026.org",
      totalFixtures:        fixtures.length,
      newlyUpdated:         updatedCount,
      totalFinished:        updatedFixtures.filter(f => f.status === "finished").length,
      externalMatchesFound: externalGames.length,
      timestamp:            new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
