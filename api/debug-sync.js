// api/debug-sync.js — temporary: shows raw data from external APIs
export default async function handler(req, res) {
  const results = {};

  // Test wcup2026.org
  try {
    const r = await fetch("https://wcup2026.org/api/data.php", {
      headers: { "Accept": "application/json", "User-Agent": "WC2026/1.0" },
    });
    const data = await r.json();
    results.wcup2026org = {
      status: r.status,
      keys: Object.keys(data),
      sample: JSON.stringify(data).slice(0, 800),
    };
  } catch(e) { results.wcup2026org = { error: e.message }; }

  // Test openfootball
  try {
    const r = await fetch(
      "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json",
      { headers: { "User-Agent": "WC2026/1.0" }, cache: "no-store" }
    );
    const data = await r.json();
    const rounds = data.rounds || [];
    const allMatches = rounds.flatMap(rnd => rnd.matches || []);
    const finished = allMatches.filter(m => m.score?.ft);
    results.openfootball = {
      status: r.status,
      totalMatches: allMatches.length,
      finishedMatches: finished.length,
      sampleFinished: finished.slice(0,3).map(m => ({
        team1: m.team1?.name,
        team2: m.team2?.name,
        ft: m.score?.ft,
      })),
    };
  } catch(e) { results.openfootball = { error: e.message }; }

  return res.status(200).json(results);
}
