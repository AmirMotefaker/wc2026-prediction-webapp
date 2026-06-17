// src/pages/MyPredictions.jsx
//
// Lets users predict scores for upcoming matches, and shows the
// outcome (points awarded) for matches that have already been scored.

import { useState } from "react";
import fixturesData from "../data/fixtures.json";
import venuesData from "../data/venues.json";
import { usePredictions } from "../hooks/usePredictions";

const GROUP_LETTERS = ["ALL","A","B","C","D","E","F","G","H","I","J","K","L"];
const VIEW_TABS = ["Upcoming", "Scored"];

export default function MyPredictions() {
  const { predictions, loading, savePrediction } = usePredictions();
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [view, setView]               = useState("Upcoming");
  const [savingId, setSavingId]       = useState(null);
  const [savedId, setSavedId]         = useState(null);

  const venuesById = {};
  for (const v of venuesData.venues) venuesById[v.id] = v;
  const fixturesById = {};
  for (const f of fixturesData.fixtures) fixturesById[f.match_id] = f;

  const predictable = fixturesData.fixtures.filter((f) => f.status === "scheduled");
  const scoredMatchIds = Object.keys(predictions).filter(
    (id) => predictions[id].scored && fixturesById[id]?.status === "finished"
  );

  const upcomingFixtures = predictable.filter(
    (f) => groupFilter === "ALL" || f.group === groupFilter
  );
  const scoredFixtures = scoredMatchIds
    .map((id) => fixturesById[id])
    .filter((f) => f && (groupFilter === "ALL" || f.group === groupFilter));

  const predictedCount = Object.keys(predictions).length;
  const totalEarned = Object.values(predictions).reduce(
    (sum, p) => sum + (p.pointsAwarded || 0), 0
  );

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
        <div className="flex gap-2">
          <span className="text-sm bg-primary-50 text-primary-600 px-3 py-1 rounded-full font-medium">
            {predictedCount} / {predictable.length + scoredMatchIds.length} predicted
          </span>
          <span className="text-sm bg-green-50 text-green-600 px-3 py-1 rounded-full font-medium">
            {totalEarned} pts earned
          </span>
        </div>
      </div>
      <p className="text-gray-400 text-sm mb-5">
        Exact score = 3 pts, correct outcome = 1 pt. Scores update automatically every 6 hours.
      </p>

      {/* View tabs */}
      <div className="flex gap-2 mb-4">
        {VIEW_TABS.map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 h-9 rounded-lg text-sm font-medium transition ${
              view === v ? "bg-gray-800 text-white" : "bg-white text-gray-600 border border-gray-200"
            }`}>
            {v}
          </button>
        ))}
      </div>

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

      {view === "Upcoming" ? (
        <div className="space-y-3">
          {upcomingFixtures.map((match) => (
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
          {upcomingFixtures.length === 0 && (
            <p className="text-center text-gray-400 py-10">
              No upcoming matches in this group.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {scoredFixtures.map((match) => (
            <ScoredCard
              key={match.match_id}
              match={match}
              prediction={predictions[match.match_id]}
            />
          ))}
          {scoredFixtures.length === 0 && (
            <p className="text-center text-gray-400 py-10">
              No scored predictions yet — check back after matches finish!
            </p>
          )}
        </div>
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
        <span>路</span>
        <span>{match.date}</span>
        {venue && (
          <>
            <span>路</span>
            <span>{venue.city}</span>
          </>
        )}
      </div>

      <div className="flex items-center justify-center gap-3">
        <span className="flex-1 text-right font-semibold text-gray-800">
          {match.team_a_name}
        </span>

        <input
          type="number" min="0" max="20"
          value={scoreA}
          onChange={(e) => setScoreA(e.target.value)}
          className="w-14 h-12 text-center text-xl font-bold border-2 border-gray-200 rounded-lg focus:border-primary-400 focus:outline-none"
          placeholder="-"
        />
        <span className="text-gray-300">:</span>
        <input
          type="number" min="0" max="20"
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
            saved ? "bg-green-100 text-green-600"
            : hasChanges ? "bg-primary-600 text-white hover:bg-primary-800"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {saving ? "Saving..." : saved ? "Saved" : existing ? "Update" : "Save Prediction"}
        </button>
      </div>
    </div>
  );
}

function ScoredCard({ match, prediction }) {
  const pts = prediction.pointsAwarded ?? 0;
  const exact = pts === 3;
  const correct = pts === 1;

  return (
    <div className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${
      exact ? "border-green-400" : correct ? "border-yellow-400" : "border-gray-200"
    }`}>
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
        <span className="bg-gray-100 px-2 py-0.5 rounded font-medium text-gray-600">
          Group {match.group}
        </span>
        <span>{match.date}</span>
      </div>

      <div className="flex items-center justify-center gap-4">
        <div className="flex-1 text-right">
          <p className="font-semibold text-gray-800">{match.team_a_name}</p>
          <p className="text-xs text-gray-400">Your pick: {prediction.scoreA}</p>
        </div>

        <div className="text-center">
          <p className="text-lg font-bold text-gray-800">
            {match.score_a} : {match.score_b}
          </p>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            exact ? "bg-green-100 text-green-600"
            : correct ? "bg-yellow-100 text-yellow-700"
            : "bg-gray-100 text-gray-500"
          }`}>
            {exact ? "+3 Exact!" : correct ? "+1 Outcome" : "0 pts"}
          </span>
        </div>

        <div className="flex-1">
          <p className="font-semibold text-gray-800">{match.team_b_name}</p>
          <p className="text-xs text-gray-400">Your pick: {prediction.scoreB}</p>
        </div>
      </div>
    </div>
  );
}
