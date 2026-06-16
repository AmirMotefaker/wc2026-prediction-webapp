// api/fifa-rankings.js
// Vercel Serverless Function — proxies FIFA Rankings API (free tier)
// Auto-deployed by Vercel on every git push

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  try {
    const url =
      "https://api.fifa.com/api/v3/rankings/men?count=210&language=en";

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WC2026-App/1.0)",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`FIFA API returned ${response.status}`);
    }

    const json = await response.json();

    const rankings = (json.Results || []).map((r) => ({
      rank:   r.RankingPosition,
      id:     r.IdTeam,
      name:   r.TeamName?.[0]?.Description || r.IdTeam,
      points: Math.round(r.Points),
    }));

    // Cache for 1 hour on Vercel Edge
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
    return res.status(200).json({
      rankings,
      updated: new Date().toISOString(),
      source: "live",
      total: rankings.length,
    });
  } catch (err) {
    console.error("FIFA Rankings error:", err.message);
    return res.status(500).json({
      error: err.message,
      source: "error",
    });
  }
}
