// src/components/AIPredictionCard.jsx
//
// Fetches and displays an AI-suggested prediction for a single match
// using our own Poisson + Monte Carlo engine (api/predict-engine.js).
// Shown inline on the "My Picks" page next to the user's own pick.

import { useState } from "react";

export default function AIPredictionCard({ matchId }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [expanded, setExpanded] = useState(false);

  async function loadPrediction() {
    if (data) {
      setExpanded((e) => !e);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/predict-engine?matchId=${matchId}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setExpanded(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        onClick={loadPrediction}
        disabled={loading}
        className="text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1 mx-auto"
      >
        {loading ? (
          "🤖 Calculating..."
        ) : (
          <>🤖 {expanded ? "Hide" : "Show"} AI Suggestion</>
        )}
      </button>

      {error && (
        <p className="text-xs text-red-400 text-center mt-1">{error}</p>
      )}

      {expanded && data && (
        <div className="mt-3 bg-primary-50 rounded-lg p-3 border border-primary-100">
          <div className="flex items-center justify-between text-xs text-primary-700 mb-2">
            <span className="font-semibold">AI Engine Suggestion</span>
            <span className={`px-2 py-0.5 rounded-full font-bold ${
              data.verdict.confidence === "HIGH" ? "bg-green-100 text-green-700"
              : data.verdict.confidence === "MEDIUM" ? "bg-yellow-100 text-yellow-700"
              : "bg-gray-100 text-gray-600"
            }`}>
              {data.verdict.confidence} confidence
            </span>
          </div>

          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="flex-1 text-right">
              <p className="text-xs text-gray-500">{data.match.teamA}</p>
              <p className="text-lg font-bold text-primary-700">
                {data.probabilities.winA}%
              </p>
            </div>
            <div className="text-center px-2">
              <p className="text-xs text-gray-500">Draw</p>
              <p className="text-lg font-bold text-gray-600">
                {data.probabilities.draw}%
              </p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">{data.match.teamB}</p>
              <p className="text-lg font-bold text-primary-700">
                {data.probabilities.winB}%
              </p>
            </div>
          </div>

          <div className="text-center text-xs text-gray-600 mb-2">
            Suggested score:{" "}
            <span className="font-bold text-primary-700">
              {data.verdict.mostLikelyScoreline}
            </span>
            {" · "}
            Expected goals: {data.expectedGoals.teamA} - {data.expectedGoals.teamB}
          </div>

          <div className="flex justify-center gap-3 text-xs text-gray-500 border-t border-primary-100 pt-2">
            <span>Over 2.5: {data.market.over25}%</span>
            <span>BTTS: {data.market.btts}%</span>
            <span>TSI gap: {data.tsi.gap}</span>
          </div>

          {data.tsi.upsetRisk === "HIGH" && (
            <p className="text-xs text-orange-600 text-center mt-2 font-medium">
              ⚠️ High upset risk — TSI gap under 8 points
            </p>
          )}
        </div>
      )}
    </div>
  );
}
