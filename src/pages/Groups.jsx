// src/pages/Groups.jsx
//
// Displays all 12 World Cup 2026 groups with LIVE standings tables
// computed automatically from fixtures.json results (no manual entry).

import { useState } from "react";
import teamsData from "../data/teams.json";
import fixturesData from "../data/fixtures.json";

const GROUP_LETTERS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

function computeStandings(groupLetter) {
  const teams = teamsData.teams.filter((t) => t.group === groupLetter);
  const table = {};
  for (const t of teams) {
    table[t.id] = {
      id: t.id, name: t.name, host: t.host_nation,
      played: 0, won: 0, draw: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0,
    };
  }

  const groupMatches = fixturesData.fixtures.filter(
    (f) => f.group === groupLetter && f.status === "finished"
  );

  for (const m of groupMatches) {
    const a = table[m.team_a];
    const b = table[m.team_b];
    if (!a || !b) continue;

    a.played++; b.played++;
    a.goalsFor += m.score_a; a.goalsAgainst += m.score_b;
    b.goalsFor += m.score_b; b.goalsAgainst += m.score_a;

    if (m.score_a > m.score_b) { a.won++; a.points += 3; b.lost++; }
    else if (m.score_a < m.score_b) { b.won++; b.points += 3; a.lost++; }
    else { a.draw++; b.draw++; a.points += 1; b.points += 1; }
  }

  const rows = Object.values(table).map((r) => ({
    ...r, goalDiff: r.goalsFor - r.goalsAgainst,
  }));

  // Standard tiebreak: points -> goal diff -> goals for -> name
  rows.sort((x, y) =>
    y.points - x.points ||
    y.goalDiff - x.goalDiff ||
    y.goalsFor - x.goalsFor ||
    x.name.localeCompare(y.name)
  );

  return rows;
}

export default function Groups() {
  const [selectedGroup, setSelectedGroup] = useState("A");
  const standings = computeStandings(selectedGroup);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Groups</h2>
      <p className="text-gray-500 text-sm mb-1">
        Live standings — automatically calculated from match results
      </p>
      <p className="text-gray-400 text-xs mb-6">
        Source: FIFA.com · Last updated June 18, 2026 (Matchday 1 complete for all 12 groups)
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {GROUP_LETTERS.map((g) => (
          <button
            key={g}
            onClick={() => setSelectedGroup(g)}
            className={`w-10 h-10 rounded-lg font-semibold text-sm transition ${
              selectedGroup === g
                ? "bg-primary-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-primary-400"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="bg-primary-600 text-white px-4 py-3 flex items-center justify-between">
          <h3 className="font-bold">Group {selectedGroup}</h3>
          <span className="text-xs text-primary-100">
            Top 2 + best 3rd-placed teams qualify
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-gray-100 bg-gray-50">
              <th className="text-left px-3 py-2 font-medium">#</th>
              <th className="text-left px-3 py-2 font-medium">Team</th>
              <th className="text-center px-2 py-2 font-medium">P</th>
              <th className="text-center px-2 py-2 font-medium">W</th>
              <th className="text-center px-2 py-2 font-medium">D</th>
              <th className="text-center px-2 py-2 font-medium">L</th>
              <th className="text-center px-2 py-2 font-medium">GF</th>
              <th className="text-center px-2 py-2 font-medium">GA</th>
              <th className="text-center px-2 py-2 font-medium">GD</th>
              <th className="text-center px-3 py-2 font-medium">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, idx) => (
              <tr
                key={row.id}
                className={`border-b border-gray-50 hover:bg-gray-50 ${
                  idx < 2 ? "bg-green-50/40" : ""
                }`}
              >
                <td className="px-3 py-3 text-gray-400">{idx + 1}</td>
                <td className="px-3 py-3 font-medium text-gray-800">
                  {row.name}
                  {row.host && (
                    <span className="ml-2 text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full">
                      Host
                    </span>
                  )}
                </td>
                <td className="px-2 py-3 text-center text-gray-600">{row.played}</td>
                <td className="px-2 py-3 text-center text-gray-600">{row.won}</td>
                <td className="px-2 py-3 text-center text-gray-600">{row.draw}</td>
                <td className="px-2 py-3 text-center text-gray-600">{row.lost}</td>
                <td className="px-2 py-3 text-center text-gray-600">{row.goalsFor}</td>
                <td className="px-2 py-3 text-center text-gray-600">{row.goalsAgainst}</td>
                <td className="px-2 py-3 text-center text-gray-600">
                  {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                </td>
                <td className="px-3 py-3 text-center font-bold text-primary-600">
                  {row.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 bg-gray-50 text-xs text-gray-400 border-t border-gray-100">
          <span className="inline-block w-3 h-3 bg-green-50 border border-green-200 rounded mr-1.5 align-middle"></span>
          Currently in qualification position (top 2)
        </div>
      </div>
    </div>
  );
}
