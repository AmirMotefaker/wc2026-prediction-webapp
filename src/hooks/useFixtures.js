// src/hooks/useFixtures.js
//
// Loads fixtures from Firestore live cache (updated by /api/sync-results cron)
// Falls back to local fixtures.json if Firestore cache is empty.

import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import localFixtures from "../data/fixtures.json";

export function useFixtures() {
  const [fixtures, setFixtures] = useState(localFixtures.fixtures);
  const [lastSynced, setLastSynced] = useState(null);
  const [source, setSource] = useState("local");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to Firestore live cache — updates in real-time when cron runs
    const unsubscribe = onSnapshot(
      doc(db, "cache", "fixtures"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.fixtures?.length) {
            setFixtures(data.fixtures);
            setSource(data.source || "firestore");
            setLastSynced(data.lastSynced || null);
          }
        }
        setLoading(false);
      },
      (err) => {
        console.warn("Firestore fixtures cache unavailable:", err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { fixtures, lastSynced, source, loading };
}
