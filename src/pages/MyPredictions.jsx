// src/pages/MyPredictions.jsx
//
// Lets users predict scores for upcoming matches.
// Predictions lock automatically once the match has started (status != scheduled).

import { useState } from "react";
import fixturesData from "../data/fixtures.json";
import venuesData from "../data/venues.json";
import { usePredictions } from "../hooks/usePredictions";

const GROUP_LETTERS = ["ALL","A","B","C","D","E","F","G","H","I","J","K","L"];

export default function MyPredictions() {
  const { predictions, loading, savePrediction } = usePredictions();
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [savingId, setSavingId] = useState(null);
  const [savedId, setSavedId]   = useState(null);

  const venuesById = {};
  for (const v of venuesData.venues) venuesById[v.id] = v;

  // Only show matches that haven't started yet
  const predictable = fixturesData.fixtures.filter(
    (f) => f.status === "scheduled"
  );

  const fixtures = predictable.filter(
    (f) => groupFilter === "ALL" || f.group === groupFilter
  );

  const predictedCount = Object.keys(predictions).length;

  async function handleSave(matchId, scoreA, scoreB) {
    if (scoreA === "" || scoreB === "") return;
    setSavingId(matchId);
    const result = await savePrediction(matchId, parseInt(scoreA), parseInt(scoreB));
    setSavingId(null);
    if (result.ok) {
      setSavedId(matchId);
      setTimeout(() => setSavedId(null), 1500);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 text-center text-gray-400">
        Loading your predictions...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl font-bold text-gray-800">My Predictions</h2>
        <span className="text-sm bg-primary-50 text-primary-600 px-3 py-1 rounded-full font-medium">
          {predictedCount} / {predictable.length} predicted
        </span>
      </div>
      <p className="text-gray-400 text-sm mb-5">
        Predict the score before kickoff. Exact score = 3 pts, correct outcome = 1 pt.
      </p>

      {/* Group filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {GROUP_LETTERS.map((g) => (
          <button key={g} onClick={() => setGroupFilter(g)}
            className={`px-3 h-8 rounded-lg text-sm font-medium transition ${
              groupFilter === g ? "bg-primary-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-primary-400"
            }`}>
            {g === "ALL" ? "All" : g}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {fixtures.map((match) => (
          <PredictionCard
            key={match.match_id}
            match={match}
            venue={venuesById[match.venue]}
            existing={predictions[match.match_id]}
            saving={savingId === match.match_id}
            saved={savedId === match.match_id}
            onSave={handleSave}
          />
        ))}
      </div>

      {fixtures.length === 0 && (
        <p className="text-center text-gray-400 py-10">
          No predictable matches in this group right now.
        </p>
      )}
    </div>
  );
}

function PredictionCard({ match, venue, existing, saving, saved, onSave }) {
  const [scoreA, setScoreA] = useState(existing?.scoreA ?? "");
  const [scoreB, setScoreB] = useState(existing?.scoreB ?? "");

  const hasChanges =
    scoreA !== "" && scoreB !== "" &&
    (scoreA !== existing?.scoreA || scoreB !== existing?.scoreB);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
        <span className="bg-gray-100 px-2 py-0.5 rounded font-medium text-gray-600">
          Group {match.group}
        </span>
        <span>MD{match.matchday}</span>
        <span>·</span>
        <span>{match.date}</span>
        {venue && (
          <>
            <span>·</span>
            <span>📍 {venue.city}</span>
          </>
        )}
      </div>

      <div className="flex items-center justify-center gap-3">
        <span className="flex-1 text-right font-semibold text-gray-800">
          {match.team_a_name}
        </span>

        <input
          type="number"
          min="0"
          max="20"
          value={scoreA}
          onChange={(e) => setScoreA(e.target.value)}
          className="w-14 h-12 text-center text-xl font-bold border-2 border-gray-200 rounded-lg focus:border-primary-400 focus:outline-none"
          placeholder="-"
        />

        <span className="text-gray-300">:</span>

        <input
          type="number"
          min="0"
          max="20"
          value={scoreB}
          onChange={(e) => setScoreB(e.target.value)}
          className="w-14 h-12 text-center text-xl font-bold border-2 border-gray-200 rounded-lg focus:border-primary-400 focus:outline-none"
          placeholder="-"
        />

        <span className="flex-1 font-semibold text-gray-800">
          {match.team_b_name}
        </span>
      </div>

      <div className="flex justify-center mt-3">
        <button
          disabled={!hasChanges || saving}
          onClick={() => onSave(match.match_id, scoreA, scoreB)}
          className={`text-sm font-medium px-4 py-1.5 rounded-lg transition ${
            saved
              ? "bg-green-100 text-green-600"
              : hasChanges
              ? "bg-primary-600 text-white hover:bg-primary-800"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {saving ? "Saving..." : saved ? "✓ Saved" : existing ? "Update" : "Save Prediction"}
        </button>
      </div>
    </div>
  );
}
