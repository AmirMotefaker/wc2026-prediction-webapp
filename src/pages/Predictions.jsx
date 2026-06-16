import { useState } from "react";

const IFRAME_URL =
  "https://dataviz.theanalyst.com/opta-football-predictions/?competition=FIFA%20World%20Cup";

export default function Predictions() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">AI Predictions</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Powered by{" "}
            <a
              href="https://theanalyst.com/competition/fifa-world-cup/predictions"
              target="_blank"
              rel="noreferrer"
              className="text-primary-600 hover:underline font-medium"
            >
              Opta Supercomputer
            </a>{" "}
            - live win/draw/loss probabilities for every match
          </p>
        </div>
        <a
          href="https://theanalyst.com/competition/fifa-world-cup/predictions"
          target="_blank"
          rel="noreferrer"
          className="text-xs bg-primary-50 text-primary-600 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition"
        >
          Open full site
        </a>
      </div>

      {!loaded && (
        <div
          className="bg-gray-100 rounded-xl animate-pulse flex items-center justify-center"
          style={{ height: 600 }}
        >
          <p className="text-gray-400 text-sm">Loading Opta predictions...</p>
        </div>
      )}

      <div className={"bg-white rounded-xl shadow-sm overflow-hidden" + (loaded ? "" : " hidden")}>
        <iframe
          src={IFRAME_URL}
          title="Opta World Cup Predictions"
          width="100%"
          height="700"
          style={{ border: "none", display: "block" }}
          onLoad={() => setLoaded(true)}
          allow="fullscreen"
        />
      </div>

      <p className="text-xs text-center text-gray-400 mt-3">
        Data provided by{" "}
        <a
          href="https://www.statsperform.com/"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Stats Perform / Opta
        </a>
        . Probabilities update automatically after each match.
      </p>
    </div>
  );
}
