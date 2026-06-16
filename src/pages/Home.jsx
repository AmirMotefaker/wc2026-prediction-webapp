// src/pages/Home.jsx
//
// Dashboard: user stats + site stats + leaderboard + FIFA rankings

import { useState, useEffect } from "react";
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useFIFARankings } from "../hooks/useFIFARankings";

export default function Home() {
  const { profile }                   = useAuth();
  const { rankings, loading: rLoad,
          source, updated }           = useFIFARankings();
  const [leaderboard, setLeaderboard] = useState([]);
  const [totalUsers,  setTotalUsers]  = useState(null);
  const [lbLoading,   setLbLoading]   = useState(true);

  // Fetch leaderboard + total users from Firestore
  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const q    = query(
          collection(db, "users"),
          orderBy("totalPoints", "desc"),
          limit(20)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => d.data());
        setLeaderboard(data);

        // Total users count
        const allSnap = await getDocs(collection(db, "users"));
        setTotalUsers(allSnap.size);
      } catch (err) {
        console.error("Leaderboard error:", err);
      } finally {
        setLbLoading(false);
      }
    }
    loadLeaderboard();
  }, []);

  // Find current user's rank in leaderboard
  const myRank = leaderboard.findIndex((u) => u.uid === profile?.uid) + 1;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

      {/* ── Welcome card ── */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-200 text-sm">Welcome back</p>
            <h2 className="text-2xl font-bold mt-0.5">
              {profile?.displayName} 👋
            </h2>
          </div>
          <div className="text-right">
            <p className="text-primary-200 text-xs">Your points</p>
            <p className="text-4xl font-bold">{profile?.totalPoints ?? 0}</p>
          </div>
        </div>
        {myRank > 0 && (
          <div className="mt-4 bg-white/10 rounded-xl px-4 py-2 inline-block">
            <span className="text-sm">
              🏆 You are ranked <strong>#{myRank}</strong> out of{" "}
              {totalUsers} participants
            </span>
          </div>
        )}
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Registered Users"
          value={totalUsers ?? "–"}
          icon="👥"
        />
        <StatCard
          label="Your Rank"
          value={myRank > 0 ? `#${myRank}` : "–"}
          icon="🏅"
        />
        <StatCard
          label="Your Points"
          value={profile?.totalPoints ?? 0}
          icon="⭐"
        />
      </div>

      {/* ── Leaderboard ── */}
      <section>
        <h3 className="text-lg font-bold text-gray-800 mb-3">
          🏆 Leaderboard
        </h3>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {lbLoading ? (
            <p className="text-center text-gray-400 py-6">Loading...</p>
          ) : leaderboard.length === 0 ? (
            <p className="text-center text-gray-400 py-6">
              No predictions yet — be the first! 🎯
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
                  <th className="text-left px-4 py-2 font-medium w-10">#</th>
                  <th className="text-left px-4 py-2 font-medium">Player</th>
                  <th className="text-right px-4 py-2 font-medium">Points</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((u, idx) => {
                  const isMe = u.uid === profile?.uid;
                  return (
                    <tr
                      key={u.uid}
                      className={`border-b border-gray-50 ${
                        isMe ? "bg-primary-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-4 py-3">
                        {idx === 0 ? "🥇"
                          : idx === 1 ? "🥈"
                          : idx === 2 ? "🥉"
                          : <span className="text-gray-400">{idx + 1}</span>}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {u.displayName}
                        {isMe && (
                          <span className="ml-2 text-xs bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-primary-600">
                        {u.totalPoints ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ── FIFA World Rankings ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-800">
            🌍 FIFA World Rankings
          </h3>
          <div className="text-xs text-gray-400 text-right">
            <span
              className={`px-2 py-0.5 rounded-full ${
                source.includes("live")
                  ? "bg-green-100 text-green-600"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {source.includes("live") ? "🟢 Live" : "📁 Static"}
            </span>
            {updated && (
              <p className="mt-0.5">
                Updated: {new Date(updated).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {rLoad ? (
            <p className="text-center text-gray-400 py-6">
              Loading rankings...
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
                  <th className="text-left px-4 py-2 font-medium w-12">Rank</th>
                  <th className="text-left px-4 py-2 font-medium">Team</th>
                  <th className="text-right px-4 py-2 font-medium">Points</th>
                </tr>
              </thead>
              <tbody>
                {rankings.slice(0, 48).map((r) => (
                  <tr
                    key={r.id || r.name}
                    className="border-b border-gray-50 hover:bg-gray-50"
                  >
                    <td className="px-4 py-2 text-gray-500 font-medium">
                      #{r.rank}
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-800">
                      {r.name}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-600">
                      {r.points?.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Source:{" "}
          <a
            href="https://inside.fifa.com/fifa-world-ranking/men"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-gray-600"
          >
            FIFA/Coca-Cola Men's World Ranking
          </a>
        </p>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 text-center">
      <p className="text-2xl mb-1">{icon}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
