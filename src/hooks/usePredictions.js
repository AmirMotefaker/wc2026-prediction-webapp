// src/hooks/usePredictions.js
//
// Manages reading/writing the current user's predictions in Firestore.
// Collection: predictions/{uid}_{match_id}

import { useState, useEffect, useCallback } from "react";
import {
  doc, setDoc, getDocs, collection, query, where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export function usePredictions() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState({}); // { match_id: {scoreA, scoreB} }
  const [loading, setLoading] = useState(true);

  // Load all of this user's predictions once
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
          map[data.matchId] = { scoreA: data.scoreA, scoreB: data.scoreB };
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

  // Save/update a single prediction
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
          updatedAt: new Date(),
        });
        setPredictions((prev) => ({
          ...prev,
          [matchId]: { scoreA, scoreB },
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
