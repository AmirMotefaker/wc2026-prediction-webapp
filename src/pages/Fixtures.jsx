// src/pages/Fixtures.jsx
//
// Displays all 72 group stage fixtures, filterable by group.
// Data source: src/data/fixtures.json, src/data/venues.json

import { useState } from "react";
import fixturesData from "../data/fixtures.json";
import venuesData from "../data/venues.json";

const GROUP_LETTERS = ["ALL","A","B","C","D","E","F","G","H","I","J","K","L"];

export default function Fixtures() {
  const [filter, setFilter] = useState("ALL");

  const venuesById = {};
  for (const v of venuesData.venues) venuesById[v.id] = v;

  const fixtures = fixturesData.fixtures.filter(
    (f) => filter === "ALL" || f.group === filter
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Fixtures</h2>
      <p className="text-gray-500 text-sm mb-6">
        Group stage — 72 matches across 12 groups
      </p>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {GROUP_LETTERS.map((g) => (
          <button
            key={g}
            onClick={() => setFilter(g)}
            className={`px-3 h-9 rounded-lg font-medium text-sm transition ${
              filter === g
                ? "bg-primary-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-primary-400"
            }`}
          >
            {g === "ALL" ? "All" : g}
          </button>
        ))}
      </div>

      {/* Fixtures list */}
      <div className="space-y-3">
        {fixtures.map((match) => {
          const venue = venuesById[match.venue];
          return (
            <div
              key={match.match_id}
              className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                  <span className="bg-gray-100 px-2 py-0.5 rounded font-medium">
                    Group {match.group}
                  </span>
                  <span>MD{match.matchday}</span>
                  <span>•</span>
                  <span>{match.date}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-gray-800 text-right flex-1">
                    {match.team_a_name}
                  </span>
                  <span className="text-gray-400 text-sm px-2">vs</span>
                  <span className="font-semibold text-gray-800 flex-1">
                    {match.team_b_name}
                  </span>
                </div>
                {venue && (
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    📍 {venue.common_name}, {venue.city}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {fixtures.length === 0 && (
        <p className="text-center text-gray-400 py-8">No fixtures found.</p>
      )}
    </div>
  );
}
