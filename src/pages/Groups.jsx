// src/pages/Groups.jsx
//
// Displays all 12 World Cup 2026 groups with their 4 teams each.
// Data source: src/data/teams.json

import { useState } from "react";
import teamsData from "../data/teams.json";

const GROUP_LETTERS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

export default function Groups() {
  const [selectedGroup, setSelectedGroup] = useState("A");

  const teamsByGroup = {};
  for (const team of teamsData.teams) {
    if (!teamsByGroup[team.group]) teamsByGroup[team.group] = [];
    teamsByGroup[team.group].push(team);
  }
  // Sort each group by TSI descending for a "seeded" look
  for (const g of Object.keys(teamsByGroup)) {
    teamsByGroup[g].sort((a, b) => b.tsi - a.tsi);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Groups</h2>
      <p className="text-gray-500 text-sm mb-6">
        All 48 teams across 12 groups — FIFA World Cup 2026
      </p>

      {/* Group selector tabs */}
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

      {/* Selected group teams */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="bg-primary-600 text-white px-4 py-3">
          <h3 className="font-bold">Group {selectedGroup}</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-gray-100">
              <th className="text-left px-4 py-2 font-medium">#</th>
              <th className="text-left px-4 py-2 font-medium">Team</th>
              <th className="text-left px-4 py-2 font-medium">FIFA Rank</th>
              <th className="text-left px-4 py-2 font-medium">TSI</th>
              <th className="text-left px-4 py-2 font-medium">Form</th>
            </tr>
          </thead>
          <tbody>
            {(teamsByGroup[selectedGroup] || []).map((team, idx) => (
              <tr key={team.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-800">
                  {team.name}
                  {team.host_nation && (
                    <span className="ml-2 text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full">
                      Host
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">#{team.fifa_rank}</td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-primary-600">{team.tsi}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {team.form_last5.map((r, i) => (
                      <FormBadge key={i} result={r} />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FormBadge({ result }) {
  const styles = {
    W: "bg-green-100 text-green-700",
    D: "bg-gray-100 text-gray-600",
    L: "bg-red-100 text-red-600",
  };
  return (
    <span className={`w-5 h-5 flex items-center justify-center rounded text-xs font-bold ${styles[result]}`}>
      {result}
    </span>
  );
}
