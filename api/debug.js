// api/debug.js — temporary diagnostic endpoint
export default function handler(req, res) {
  return res.status(200).json({
    hasFirebaseProjectId:  !!process.env.FIREBASE_PROJECT_ID,
    hasFirebaseClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    hasFirebasePrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    hasViteProjectId:      !!process.env.VITE_FIREBASE_PROJECT_ID,
    hasViteApiKey:         !!process.env.VITE_FIREBASE_API_KEY,
    hasCronSecret:         !!process.env.CRON_SECRET,
    nodeVersion:           process.version,
  });
}
