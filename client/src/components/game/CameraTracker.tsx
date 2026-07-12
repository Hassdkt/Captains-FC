/**
 * CameraTracker
 *
 * Drop-in component for the race screen.
 * Shows: camera feed | live touch count | status messages | fallback manual button.
 *
 * Props:
 *   target      – touches needed to complete
 *   color       – mode accent colour (for ring / progress bar)
 *   onComplete  – called when target is reached (auto or manual)
 *   onManual    – called when player taps DONE manually
 *   doneLabel   – label on manual DONE button
 *   enabled     – whether to run detection (default true)
 */

import { useRef, useEffect } from "react";
import { useJuggleDetector } from "@/hooks/useJuggleDetector";

interface CameraTrackerProps {
  target: number;
  color: string;
  onComplete: () => void;
  onManual: () => void;
  doneLabel: string;
  enabled?: boolean;
}

export default function CameraTracker({
  target,
  color,
  onComplete,
  onManual,
  doneLabel,
  enabled = true,
}: CameraTrackerProps) {
  const { count, status, videoRef, canvasRef, error } = useJuggleDetector({
    target,
    onComplete,
    enabled,
  });

  const pct = Math.min(100, Math.round((count / target) * 100));
  const isLoading = status === "loading" || status === "requesting_camera";
  const isDenied = status === "camera_denied";
  const isError = status === "error";
  const isRunning = status === "running";

  return (
    <div className="w-full flex flex-col items-center gap-4">

      {/* Camera view */}
      <div
        className="relative w-full overflow-hidden rounded-2xl"
        style={{
          aspectRatio: "3/4",
          background: "hsl(220 18% 10%)",
          border: `2px solid ${isRunning ? color + "60" : "hsl(220 15% 22%)"}`,
          boxShadow: isRunning ? `0 0 24px ${color}30` : "none",
          maxHeight: "42vh",
        }}
      >
        {/* Video element — always mounted so ref is stable */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            transform: "scaleX(-1)", // mirror front cam
            opacity: isRunning ? 1 : 0.15,
          }}
          playsInline
          muted
        />

        {/* Flash canvas overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          width={640}
          height={480}
        />

        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: color, borderTopColor: "transparent" }} />
            <p className="text-xs font-body text-center px-4" style={{ color: "hsl(215 12% 55%)" }}>
              {status === "loading" ? "Loading pose detector…" : "Starting camera…"}
            </p>
          </div>
        )}

        {/* Camera denied / error — show icon + Safari instructions */}
        {(isDenied || isError) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 text-center">
            <div className="text-5xl">{isDenied ? "📷" : "⚠️"}</div>
            <p className="font-display text-base" style={{ color: "#fff" }}>
              {isDenied ? "Camera Access Needed" : "Camera Unavailable"}
            </p>
            {isDenied && (
              <div className="rounded-xl px-4 py-3 text-left" style={{ background: "hsl(220 16% 14%)", border: "1px solid hsl(220 15% 24%)" }}>
                <p className="text-xs font-body font-bold mb-1" style={{ color: "hsl(45 95% 55%)" }}>On Safari / iPhone:</p>
                <p className="text-xs font-body leading-relaxed" style={{ color: "hsl(215 12% 60%)" }}>
                  Settings → Safari → Camera → Allow
                </p>
                <p className="text-xs font-body mt-2 leading-relaxed" style={{ color: "hsl(215 12% 45%)" }}>
                  Or open this game as a standalone link (not inside the app preview).
                </p>
              </div>
            )}
            <p className="text-xs font-body" style={{ color: "hsl(215 12% 40%)" }}>
              Use the DONE button below to count manually.
            </p>
          </div>
        )}

        {/* Count bubble — top centre when running */}
        {isRunning && (
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 font-display font-bold text-3xl rounded-full px-5 py-1.5 backdrop-blur-sm"
            style={{
              background: "rgba(10,14,30,0.72)",
              color,
              border: `2px solid ${color}80`,
              textShadow: `0 0 12px ${color}`,
              minWidth: "5.5rem",
              textAlign: "center",
            }}
          >
            {count} <span className="text-base font-normal opacity-60">/ {target}</span>
          </div>
        )}

        {/* "Point camera at feet" hint */}
        {isRunning && count === 0 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center">
            <div className="rounded-xl px-3 py-1.5 text-xs font-body backdrop-blur-sm"
              style={{ background: "rgba(10,14,30,0.72)", color: "hsl(215 12% 60%)" }}>
              👟 Point camera at your feet
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "hsl(220 16% 18%)" }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}` }}
        />
      </div>

      {/* Touch count text */}
      <div className="text-center">
        <div className="font-display font-bold" style={{ fontSize: "3.5rem", color, lineHeight: 1, textShadow: `0 0 20px ${color}50` }}>
          {count}
        </div>
        <div className="text-xs font-body mt-0.5" style={{ color: "hsl(215 12% 50%)" }}>
          touches detected
        </div>
      </div>

      {/* Manual DONE — always visible as fallback */}
      <button
        data-testid="button-done-manual"
        onClick={onManual}
        className="w-full font-display font-bold rounded-2xl transition-all"
        style={{
          background: isRunning ? "hsl(220 16% 16%)" : "hsl(45 95% 55%)",
          color: isRunning ? "hsl(215 12% 50%)" : "#000",
          border: isRunning ? `1.5px solid hsl(220 15% 26%)` : "none",
          fontSize: isRunning ? "1rem" : "clamp(1.5rem, 8vw, 2rem)",
          paddingTop: isRunning ? "0.875rem" : "1.75rem",
          paddingBottom: isRunning ? "0.875rem" : "1.75rem",
          boxShadow: isRunning ? "none" : "0 8px 32px hsl(45 95% 55% / 0.5)",
        }}
      >
        {isRunning ? `✋ ${doneLabel} (manual)` : `✅ ${doneLabel}`}
      </button>

    </div>
  );
}
