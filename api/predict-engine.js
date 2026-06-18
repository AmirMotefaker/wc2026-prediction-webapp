// api/predict-engine.js
//
// JavaScript port of the Python prediction engine (tsi_calculator.py +
// poisson_model.py + monte_carlo.py) — runs as a Vercel Serverless
// Function so the React app can request an AI-suggested prediction
// for any fixture without needing a separate Python backend.
//
// GET /api/predict-engine?matchId=M001

import teamsData from "../src/data/teams.json";
import venuesData from "../src/data/venues.json";
import fixturesData from "../src/data/fixtures.json";

// ─── TSI Calculator (ported from tsi_calculator.py) ──────────────────────────

const WEIGHTS = {
  fifaRank: 0.20, elo: 0.25, xgFor: 0.15,
  xgAgainst: 0.15, form: 0.15, squadDepth: 0.10,
};
const BOUNDS = {
  fifaRank:   { min: 1,    max: 90 },
  elo:        { min: 1650, max: 2100 },
  xgFor:      { min: 0.80, max: 2.50 },
  xgAgainst:  { min: 0.70, max: 1.70 },
  form:       { min: 0,    max: 15 },
  squadDepth: { min: 4.0,  max: 10.0 },
};

function normalize(value, min, max, invert = false) {
  const clamped = Math.max(min, Math.min(max, value));
  const norm = (clamped - min) / (max - min);
  return invert ? 1 - norm : norm;
}

function calculateTSI(team) {
  const c = {
    fifaRank:   normalize(team.fifa_rank, BOUNDS.fifaRank.min, BOUNDS.fifaRank.max, true),
    elo:        normalize(team.elo_rating, BOUNDS.elo.min, BOUNDS.elo.max),
    xgFor:      normalize(team.xg_for_avg, BOUNDS.xgFor.min, BOUNDS.xgFor.max),
    xgAgainst:  normalize(team.xg_against_avg, BOUNDS.xgAgainst.min, BOUNDS.xgAgainst.max, true),
    form:       normalize(team.form_score, BOUNDS.form.min, BOUNDS.form.max),
    squadDepth: normalize(team.squad_depth_score, BOUNDS.squadDepth.min, BOUNDS.squadDepth.max),
  };
  const tsi = Object.keys(WEIGHTS).reduce((sum, k) => sum + c[k] * WEIGHTS[k], 0);
  return Math.round(tsi * 100 * 100) / 100;
}

// ─── Poisson xG Model (ported from poisson_model.py) ─────────────────────────

const ALTITUDE_MODIFIERS = { low: 1.0, medium: 1.02, high: 1.05, extreme: 1.12 };
const WEATHER_MODIFIERS = {
  mild: 1.0, cool_mild: 1.0, warm: 0.99, warm_coastal: 1.0,
  warm_humid: 0.98, hot: 0.96, hot_humid: 0.94, extreme_heat: 0.94,
  mild_highland: 1.0, warm_highland: 1.0,
};
const STAGE_MODIFIERS = {
  group: { goalFactor: 1.0, drawBonus: 0.0 },
  round_of_32: { goalFactor: 0.96, drawBonus: 0.02 },
  round_of_16: { goalFactor: 0.94, drawBonus: 0.03 },
  quarterfinal: { goalFactor: 0.93, drawBonus: 0.04 },
  semifinal: { goalFactor: 0.92, drawBonus: 0.05 },
  final: { goalFactor: 0.91, drawBonus: 0.05 },
};

function computeLambda(xgFor, xgAgainstOpp, venue, isHost, stage) {
  const base = Math.sqrt(xgFor * xgAgainstOpp);
  const altMod = ALTITUDE_MODIFIERS[venue.altitude_category] || 1.0;
  const weatherMod = WEATHER_MODIFIERS[venue.weather_category] || 1.0;
  const stageMod = (STAGE_MODIFIERS[stage] || STAGE_MODIFIERS.group).goalFactor;
  const hostMod = isHost ? 1.08 : 1.0;
  const lambda = base * altMod * weatherMod * stageMod * hostMod;
  return Math.max(0.20, Math.round(lambda * 10000) / 10000);
}

// ─── Poisson PMF + analytical probabilities ──────────────────────────────────

function factorial(n) {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

function poissonPMF(k, lambda) {
  if (lambda <= 0) return k === 0 ? 1.0 : 0.0;
  return Math.exp(-lambda) * Math.pow(lambda, k) / factorial(k);
}

function analyticalProbabilities(lambdaA, lambdaB, maxGoals = 8) {
  let winA = 0, draw = 0, winB = 0;
  const scorelines = [];

  for (let i = 0; i <= maxGoals; i++) {
    for (let j = 0; j <= maxGoals; j++) {
      const p = poissonPMF(i, lambdaA) * poissonPMF(j, lambdaB);
      scorelines.push({ a: i, b: j, p: p * 100 });
      if (i > j) winA += p;
      else if (i === j) draw += p;
      else winB += p;
    }
  }
  scorelines.sort((x, y) => y.p - x.p);

  const total = lambdaA + lambdaB;
  let over25 = 1, over15 = 1;
  for (let k = 0; k < 3; k++) over25 -= poissonPMF(k, total);
  for (let k = 0; k < 2; k++) over15 -= poissonPMF(k, total);
  const btts = (1 - poissonPMF(0, lambdaA)) * (1 - poissonPMF(0, lambdaB));

  return {
    winA: round1(winA * 100), draw: round1(draw * 100), winB: round1(winB * 100),
    expectedGoalsA: round2(lambdaA), expectedGoalsB: round2(lambdaB),
    topScorelines: scorelines.slice(0, 5).map(s => ({
      scoreline: `${s.a}-${s.b}`, probability: round1(s.p),
    })),
    over25: round1(over25 * 100), over15: round1(over15 * 100), btts: round1(btts * 100),
  };
}

function round1(n) { return Math.round(n * 10) / 10; }
function round2(n) { return Math.round(n * 100) / 100; }

// ─── Main handler ──────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { matchId } = req.query;
  if (!matchId) {
    return res.status(400).json({ error: "matchId query param required" });
  }

  const match = fixturesData.fixtures.find((f) => f.match_id === matchId);
  if (!match) {
    return res.status(404).json({ error: `Match ${matchId} not found` });
  }

  const teamA = teamsData.teams.find((t) => t.id === match.team_a);
  const teamB = teamsData.teams.find((t) => t.id === match.team_b);
  const venue = venuesData.venues.find((v) => v.id === match.venue);

  if (!teamA || !teamB || !venue) {
    return res.status(404).json({ error: "Team or venue data missing" });
  }

  const tsiA = calculateTSI(teamA);
  const tsiB = calculateTSI(teamB);
  const gap = Math.round(Math.abs(tsiA - tsiB) * 100) / 100;

  const lambdaA = computeLambda(teamA.xg_for_avg, teamB.xg_against_avg, venue, teamA.host_nation, match.stage);
  const lambdaB = computeLambda(teamB.xg_for_avg, teamA.xg_against_avg, venue, teamB.host_nation, match.stage);

  const probs = analyticalProbabilities(lambdaA, lambdaB);

  let verdict = "Draw";
  if (probs.winA > probs.winB && probs.winA > probs.draw) verdict = teamA.name;
  else if (probs.winB > probs.winA && probs.winB > probs.draw) verdict = teamB.name;

  const maxP = Math.max(probs.winA, probs.draw, probs.winB);
  const confidence = maxP >= 55 ? "HIGH" : maxP >= 40 ? "MEDIUM" : "LOW";

  return res.status(200).json({
    match: { teamA: teamA.name, teamB: teamB.name, venue: venue.common_name, stage: match.stage },
    tsi: { teamA: tsiA, teamB: tsiB, gap, favourite: tsiA >= tsiB ? teamA.name : teamB.name,
           upsetRisk: gap < 8 ? "HIGH" : gap < 18 ? "MEDIUM" : "LOW" },
    probabilities: { winA: probs.winA, draw: probs.draw, winB: probs.winB },
    expectedGoals: { teamA: probs.expectedGoalsA, teamB: probs.expectedGoalsB },
    topScorelines: probs.topScorelines,
    market: { over25: probs.over25, over15: probs.over15, btts: probs.btts },
    verdict: { mostLikelyWinner: verdict, mostLikelyScoreline: probs.topScorelines[0]?.scoreline, confidence },
    engine: "WC2026 Poisson + Analytical Distribution v1.0 (JS port)",
  });
}
