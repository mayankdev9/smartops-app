"use client";

import { useEffect, useState } from "react";
import { Joyride, STATUS, type EventData, type Step } from "react-joyride";

/** Thin wrapper around react-joyride matching the brand + existing panel chrome. */
export default function ProductTour({
  steps,
  run,
  onFinish,
}: {
  steps: Step[];
  run: boolean;
  onFinish: () => void;
}) {
  // Avoid a hydration mismatch: Joyride reads the DOM, so only render client-side.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || steps.length === 0) return null;

  function handleEvent(data: EventData) {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      onFinish();
    }
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      scrollToFirstStep
      onEvent={handleEvent}
      options={{
        primaryColor: "#1d4ed8",
        zIndex: 10000,
        arrowColor: "#fff",
        backgroundColor: "#fff",
        textColor: "#1e293b",
        overlayColor: "rgba(0,0,0,0.3)",
        showProgress: true,
        skipBeacon: true,
        buttons: ["back", "close", "primary", "skip"],
      }}
      styles={{
        tooltip: { borderRadius: 12, fontSize: 14 },
        tooltipContent: { padding: "8px 0" },
        buttonPrimary: { backgroundColor: "#1d4ed8", borderRadius: 8, fontSize: 13, padding: "8px 14px" },
        buttonBack: { color: "#64748b", fontSize: 13 },
        buttonSkip: { color: "#94a3b8", fontSize: 13 },
      }}
    />
  );
}
