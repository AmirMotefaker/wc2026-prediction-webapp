// src/hooks/useFIFARankings.js
//
// Fetches live FIFA rankings from Vercel Serverless Function (/api/fifa-rankings)
// Falls back to static teams.json if the API is unavailable.

import { useState, useEffect } from "react";
import teamsData from "../data/teams.json";

function buildStaticRankings() {
  return [...teamsData.teams]
    .sort((a, b) => a.fifa_rank - b.fifa_rank)
    .map((t) => ({
      rank:   t.fifa_rank,
      name:   t.name,
      id:     t.id,
      points: t.elo_rating,
    }));
}

export function useFIFARankings() {
  const [rankings, setRankings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [source,   setSource]   = useState("static");
  const [updated,  setUpdated]  = useState(null);

  useEffect(() => {
    async function load() {
      try {
        // /api/fifa-rankings works locally (vite proxy) and on Vercel
        const res = await fetch("/api/fifa-rankings");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setRankings(json.rankings || []);
        setSource("live");
        setUpdated(json.updated);
      } catch (err) {
        console.warn("Using static FIFA data:", err.message);
        setRankings(buildStaticRankings());
        setSource("static");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { rankings, loading, source, updated };
}
