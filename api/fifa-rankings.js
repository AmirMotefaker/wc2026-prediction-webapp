// api/fifa-rankings.js
//
// Vercel Serverless Function — fetches FIFA Rankings.
//
// FIFA does not publish a stable public API (endpoints change without
// notice and the "official" ones require a dynamically-generated dateId
// that isn't predictable). To keep this 100% free and reliable, this
// function tries the known FIFA endpoint first, and if it fails for any
// reason, gracefully falls back to our static teams.json dataset so the
// app never shows broken data.

import teamsData from "../src/data/teams.json";

function staticRankings() {
  return [...teamsData.teams]
    .sort((a, b) => a.fifa_rank - b.fifa_rank)
    .map((t) => ({
      rank: t.fifa_rank,
      name: t.name,
      id: t.id,
      points: t.elo_rating,
    }));
}

async function tryFetchFIFA() {
  // FIFA's ranking-overview endpoint requires a dateId for the current
  // ranking period. We first fetch the ranking page to discover the
  // latest dateId, then call the data endpoint with it.
  const pageRes = await fetch("https://www.fifa.com/fifa-world-ranking/men", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; WC2026-App/1.0)" },
  });
  if (!pageRes.ok) throw new Error(`FIFA page returned ${pageRes.status}`);

  const html = await pageRes.text();
  const match = html.match(/"dateId":"(id\d+)"/);
  if (!match) throw new Error("Could not find current dateId on FIFA page");

  const dateId = match[1];
  const apiRes = await fetch(
    `https://www.fifa.com/api/ranking-overview?locale=en&dateId=${dateId}`,
    { headers: { "User-Agent": "Mozilla/5.0 (compatible; WC2026-App/1.0)" } }
  );
  if (!apiRes.ok) throw new Error(`FIFA API returned ${apiRes.status}`);

  const json = await apiRes.json();
  const list = json?.rankings || [];
  if (!list.length) throw new Error("FIFA API returned empty rankings");

  return list.map((r) => ({
    rank: r.rankingItem?.rank,
    name: r.rankingItem?.name,
    id: r.rankingItem?.countryCode || r.rankingItem?.name,
    points: Math.round(r.rankingItem?.totalPoints || 0),
  }));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  try {
    const rankings = await tryFetchFIFA();
    res.setHeader("Cache-Control", "s-maxage=43200, stale-while-revalidate"); // 12h cache
    return res.status(200).json({
      rankings,
      updated: new Date().toISOString(),
      source: "live",
      total: rankings.length,
    });
  } catch (err) {
    console.warn("FIFA live fetch failed, using static fallback:", err.message);
    return res.status(200).json({
      rankings: staticRankings(),
      updated: new Date().toISOString(),
      source: "static-fallback",
      error: err.message,
    });
  }
}
