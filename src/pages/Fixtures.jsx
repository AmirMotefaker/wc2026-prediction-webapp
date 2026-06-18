// src/pages/Fixtures.jsx
// Real WC2026 fixtures with verified results, local + Tehran kickoff times

import { useState } from "react";
import fixturesData from "../data/fixtures.json";
import venuesData from "../data/venues.json";

const GROUP_LETTERS = ["ALL","A","B","C","D","E","F","G","H","I","J","K","L"];
const MD_FILTERS = ["All MD","MD1","MD2","MD3"];

const STATUS_BADGE = {
  finished:  { label: "FT",    cls: "bg-gray-100 text-gray-600" },
  live:      { label: "LIVE",  cls: "bg-red-100 text-red-600 animate-pulse" },
  scheduled: { label: "SCH",   cls: "bg-blue-50 text-blue-500" },
};

function formatKickoffLocal(fixture) {
  // venue has local time conventions; we display the venue city's local kickoff
  // using a simple HH:MM since we don't carry timezone offsets per venue here.
  return fixture.kickoff_local || null;
}

export default function Fixtures() {
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [mdFilter, setMdFilter]       = useState("All MD");

  const venuesById = {};
  for (const v of venuesData.venues) venuesById[v.id] = v;

  const fixtures = fixturesData.fixtures.filter((f) => {
    const gOk = groupFilter === "ALL" || f.group === groupFilter;
    const mOk = mdFilter === "All MD" || f.matchday === parseInt(mdFilter.replace("MD",""));
    return gOk && mOk;
  });

  const finished  = fixturesData.fixtures.filter(f => f.status === "finished").length;
  const live      = fixturesData.fixtures.filter(f => f.status === "live").length;
  const scheduled = fixturesData.fixtures.filter(f => f.status === "scheduled").length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between mb-1">
        <h2 className="text-2xl font-bold text-gray-800">Fixtures</h2>
        <div className="text-right text-xs text-gray-400 leading-5">
          <span className="text-green-600 font-medium">{finished} FT</span>
          {live > 0 && <span className="text-red-500 font-medium ml-2">{live} LIVE</span>}
          <span className="ml-2">{scheduled} upcoming</span>
        </div>
      </div>
      <p className="text-gray-400 text-xs mb-4">
        Source: FIFA.com · ESPN · CBS Sports · Last updated June 18, 2026 · Times shown: venue local time and Iran Standard Time (UTC+3:30)
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        {GROUP_LETTERS.map((g) => (
          <button key={g} onClick={() => setGroupFilter(g)}
            className={`px-3 h-8 rounded-lg text-sm font-medium transition ${
              groupFilter === g ? "bg-primary-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-primary-400"
            }`}>
            {g === "ALL" ? "All" : g}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        {MD_FILTERS.map((md) => (
          <button key={md} onClick={() => setMdFilter(md)}
            className={`px-3 h-7 rounded text-xs font-medium transition ${
              mdFilter === md ? "bg-gray-700 text-white" : "bg-white text-gray-500 border border-gray-200 hover:border-gray-400"
            }`}>
            {md}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {fixtures.map((match) => {
          const venue  = venuesById[match.venue];
          const badge  = STATUS_BADGE[match.status] || STATUS_BADGE.scheduled;
          const isDone = match.status === "finished";
          const isLive = match.status === "live";
          const localTime = formatKickoffLocal(match);

          return (
            <div key={match.match_id}
              className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${
                isLive ? "border-red-400" : isDone ? "border-green-400" : "border-gray-200"
              }`}>

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="bg-gray-100 px-2 py-0.5 rounded font-medium text-gray-600">
                    Group {match.group}
                  </span>
                  <span>MD{match.matchday}</span>
                  <span>·</span>
                  <span>{match.date}</span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>

              <div className="flex items-center justify-center gap-4">
                <span className={`flex-1 text-right font-semibold ${isDone || isLive ? "text-gray-800" : "text-gray-500"}`}>
                  {match.team_a_name}
                </span>

                {isDone || isLive ? (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-gray-800 w-6 text-center">
                      {match.score_a ?? "–"}
                    </span>
                    <span className="text-gray-300 font-light">:</span>
                    <span className="text-2xl font-bold text-gray-800 w-6 text-center">
                      {match.score_b ?? "–"}
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-300 font-light text-lg px-2">vs</span>
                )}

                <span className={`flex-1 font-semibold ${isDone || isLive ? "text-gray-800" : "text-gray-500"}`}>
                  {match.team_b_name}
                </span>
              </div>

              {venue && (
                <p className="text-center text-xs text-gray-400 mt-2">
                  📍 {venue.common_name}, {venue.city}
                </p>
              )}

              {!isDone && (
                <div className="flex justify-center gap-4 text-xs text-gray-400 mt-1.5">
                  {localTime && <span>🕐 {localTime} local</span>}
                  <span>🇮🇷 {match.kickoff_tehran} Tehran{match.kickoff_tehran_day_offset > 0 ? " (+1 day)" : ""}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {fixtures.length === 0 && (
        <p className="text-center text-gray-400 py-10">No fixtures found.</p>
      )}
    </div>
  );
}
