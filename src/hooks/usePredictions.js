// src/hooks/usePredictions.js
//
// Manages reading/writing the current user's predictions in Firestore.
// Collection: predictions/{uid}_{match_id}
// Each prediction includes a "scored" flag (used by the scoring cron job)
// and "updatedAt" (shown to the user as "Last predicted: ...").

import { useState, useEffect, useCallback } from "react";
import {
  doc, setDoc, getDocs, collection, query, where, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export function usePredictions() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState({});
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
            updatedAt: data.updatedAt ?? null,
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

  const savePrediction = useCallback(
    async (matchId, scoreA, scoreB) => {
      if (!user) return { ok: false, error: "Not signed in" };
      try {
        const docId = `${user.uid}_${matchId}`;
        const now = new Date();
        await setDoc(doc(db, "predictions", docId), {
          uid: user.uid,
          matchId,
          scoreA,
          scoreB,
          scored: false,
          pointsAwarded: null,
          updatedAt: serverTimestamp(),
        });
        setPredictions((prev) => ({
          ...prev,
          [matchId]: { scoreA, scoreB, scored: false, pointsAwarded: null, updatedAt: now },
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
