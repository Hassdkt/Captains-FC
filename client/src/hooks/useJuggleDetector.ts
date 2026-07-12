/**
 * useJuggleDetector — v3: Motion-based ball detection
 *
 * The camera is held pointing DOWN at the player's feet/ball (top-down view).
 * MediaPipe PoseLandmarker can't find body landmarks in this orientation,
 * so we switch to a pure optical-flow approach:
 *
 * Algorithm:
 *  1. Capture each video frame into a small off-screen canvas (160×120).
 *  2. Compute per-pixel absolute diff vs the previous frame → "motion map".
 *  3. Find the centroid Y of all high-motion pixels (motion > threshold).
 *  4. Track centroid Y over time. A "touch" = centroid Y rises sharply
 *     (ball moving UP after a kick).
 *  5. Debounce to prevent double-counting.
 *
 * This works with any camera orientation — no AI model, no network requests.
 */

import { useEffect, useRef, useState, useCallback } from "react";

export type DetectorStatus =
  | "idle"
  | "loading"
  | "requesting_camera"
  | "running"
  | "camera_denied"
  | "error";

interface UseJuggleDetectorOptions {
  target: number;
  onComplete?: () => void;
  enabled?: boolean;
}

interface UseJuggleDetectorReturn {
  count: number;
  status: DetectorStatus;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  reset: () => void;
  error: string | null;
}

// ── Tuning ────────────────────────────────────────────────────────────────────
const PROC_W = 160;           // processing resolution width
const PROC_H = 120;           // processing resolution height
const MOTION_THRESHOLD = 25;  // per-pixel diff to count as "moving" (0-255)
const MIN_MOTION_PIXELS = 80; // minimum moving pixels to trust the centroid
const KICK_RISE = 6;          // centroid must rise this many px (in 160x120 space) to count
const MIN_INTERVAL_MS = 400;  // debounce between touches
const HISTORY_LEN = 6;        // frames of centroid history to look back

export function useJuggleDetector({
  target,
  onComplete,
  enabled = true,
}: UseJuggleDetectorOptions): UseJuggleDetectorReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);  // visible feedback canvas
  const procCanvasRef = useRef<HTMLCanvasElement | null>(null); // off-screen processing
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const centroidHistRef = useRef<number[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastTouchRef = useRef<number>(0);

  const [count, setCount] = useState(0);
  const [status, setStatus] = useState<DetectorStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const countRef = useRef(0);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  // ── Request camera ─────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setStatus("requesting_camera");
    if (!navigator?.mediaDevices?.getUserMedia) {
      setStatus("camera_denied");
      setError("Camera not available. Open the game as a standalone link to enable camera detection.");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      // create off-screen processing canvas
      const proc = document.createElement("canvas");
      proc.width = PROC_W;
      proc.height = PROC_H;
      procCanvasRef.current = proc;

      setStatus("running");
      return true;
    } catch (e: any) {
      setStatus("camera_denied");
      setError("Camera access denied. On iPhone: Settings → Safari → Camera → Allow.");
      return false;
    }
  }, []);

  // ── Per-frame processing ───────────────────────────────────────────────────
  const detect = useCallback(() => {
    const video = videoRef.current;
    const proc = procCanvasRef.current;
    if (!video || !proc || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }

    const ctx = proc.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(video, 0, 0, PROC_W, PROC_H);
    const frame = ctx.getImageData(0, 0, PROC_W, PROC_H).data;

    const prev = prevFrameRef.current;
    if (!prev) {
      prevFrameRef.current = new Uint8ClampedArray(frame);
      rafRef.current = requestAnimationFrame(detect);
      return;
    }

    // Compute motion centroid Y
    let sumY = 0;
    let motionCount = 0;
    for (let y = 0; y < PROC_H; y++) {
      for (let x = 0; x < PROC_W; x++) {
        const i = (y * PROC_W + x) * 4;
        const dr = Math.abs(frame[i]     - prev[i]);
        const dg = Math.abs(frame[i + 1] - prev[i + 1]);
        const db = Math.abs(frame[i + 2] - prev[i + 2]);
        const diff = (dr + dg + db) / 3;
        if (diff > MOTION_THRESHOLD) {
          sumY += y;
          motionCount++;
        }
      }
    }

    // Update previous frame
    prevFrameRef.current = new Uint8ClampedArray(frame);

    if (motionCount < MIN_MOTION_PIXELS) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }

    const centroidY = sumY / motionCount;
    const hist = centroidHistRef.current;
    hist.push(centroidY);
    if (hist.length > HISTORY_LEN) hist.shift();

    if (hist.length === HISTORY_LEN) {
      const now = performance.now();
      // A kick = centroid was low (ball on foot) → moves UP (Y decreases in image coords)
      // Look for the peak drop: oldest Y vs newest Y
      const oldest = hist[0];
      const newest = hist[hist.length - 1];
      const rise = oldest - newest; // positive when centroid moved up in image

      if (rise >= KICK_RISE && (now - lastTouchRef.current) > MIN_INTERVAL_MS) {
        lastTouchRef.current = now;
        countRef.current += 1;
        setCount(countRef.current);

        // Yellow flash on visible canvas
        const canvas = canvasRef.current;
        if (canvas) {
          const fctx = canvas.getContext("2d");
          if (fctx) {
            fctx.fillStyle = "rgba(250, 204, 21, 0.45)";
            fctx.fillRect(0, 0, canvas.width, canvas.height);
            setTimeout(() => {
              const c2 = canvasRef.current?.getContext("2d");
              if (c2) c2.clearRect(0, 0, canvas.width, canvas.height);
            }, 150);
          }
        }

        if (countRef.current >= target) {
          onCompleteRef.current?.();
          return;
        }
      }
    }

    rafRef.current = requestAnimationFrame(detect);
  }, [target]);

  // ── Start / stop ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setStatus("loading");

    (async () => {
      const camOk = await startCamera();
      if (cancelled || !camOk) return;
      rafRef.current = requestAnimationFrame(detect);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      procCanvasRef.current = null;
      prevFrameRef.current = null;
      centroidHistRef.current = [];
    };
  }, [enabled, startCamera, detect]);

  const reset = useCallback(() => {
    countRef.current = 0;
    setCount(0);
    lastTouchRef.current = 0;
    centroidHistRef.current = [];
    prevFrameRef.current = null;
  }, []);

  return { count, status, videoRef, canvasRef, reset, error };
}
