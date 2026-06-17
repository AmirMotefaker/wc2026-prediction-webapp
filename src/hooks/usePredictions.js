// src/hooks/usePredictions.js
//
// Manages reading/writing the current user's predictions in Firestore.
// Collection: predictions/{uid}_{match_id}
// Each prediction includes a "scored" flag used by the scoring cron job
// to award points exactly once per finished match.

import { useState, useEffect, useCallback } from "react";
import {
  doc, setDoc, getDocs, collection, query, where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export function usePredictions() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState({}); // { match_id: {scoreA, scoreB, pointsAwarded, scored} }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    async function load() {
      try {
        const q = query(
          collection(db, "predictions"),
          where("uid", "==", user.uid)
        );
        const snap = await getDocs(q);
        const map = {};
        snap.docs.forEach((d) => {
          const data = d.data();
          map[data.matchId] = {
            scoreA: data.scoreA,
            scoreB: data.scoreB,
            scored: data.scored ?? false,
            pointsAwarded: data.pointsAwarded ?? null,
          };
        });
        setPredictions(map);
      } catch (err) {
        console.error("Load predictions error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  // Save/update a single prediction.
  // Always resets "scored" to false on edit — this protects against
  // someone changing a pick after a result is in but before the next
  // cron run, while also ensuring fresh predictions get scored.
  const savePrediction = useCallback(
    async (matchId, scoreA, scoreB) => {
      if (!user) return { ok: false, error: "Not signed in" };
      try {
        const docId = `${user.uid}_${matchId}`;
        await setDoc(doc(db, "predictions", docId), {
          uid: user.uid,
          matchId,
          scoreA,
          scoreB,
          scored: false,
          pointsAwarded: null,
          updatedAt: new Date(),
        });
        setPredictions((prev) => ({
          ...prev,
          [matchId]: { scoreA, scoreB, scored: false, pointsAwarded: null },
        }));
        return { ok: true };
      } catch (err) {
        console.error("Save prediction error:", err);
        return { ok: false, error: err.message };
      }
    },
    [user]
  );

  return { predictions, loading, savePrediction };
}
