import { useEffect, useRef, useState, useCallback } from "react";
import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

interface JugglingTrackerProps {
  onCount: (count: number) => void;
  onStop: (finalCount: number) => void;
  maxCount?: number;
  active: boolean;
}

type TrackerState = "loading" | "ready" | "running" | "stopped" | "error" | "nocamera";

export default function JugglingTracker({ onCount, onStop, maxCount = 50, active }: JugglingTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastCountRef = useRef<number>(0);

  const [state, setState] = useState<TrackerState>("loading");
  const [count, setCount] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);

  // Foot tracking state (persistent across frames)
  const footState = useRef({
    // Track ankle Y positions (normalized: 0 = top, 1 = bottom)
    leftAnkleY: 0,
    rightAnkleY: 0,
    leftAnkleYPrev: 0,
    rightAnkleYPrev: 0,
    leftPeak: false,   // Was going up, now going down
    rightPeak: false,
    cooldown: 0,       // frames cooldown to avoid double counting
  });

  // Load MediaPipe
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });
        if (!cancelled) {
          poseLandmarkerRef.current = landmarker;
          setState("ready");
        }
      } catch (e) {
        console.error("MediaPipe load error:", e);
        if (!cancelled) setState("error");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const startCamera = useCallback(async () => {
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
      setState("running");
    } catch (e: any) {
      setState(e.name === "NotAllowedError" ? "nocamera" : "error");
    }
  }, []);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setState("stopped");
  }, []);

  // Detection loop
  useEffect(() => {
    if (state !== "running" || !poseLandmarkerRef.current) return;

    const fs = footState.current;
    let lastVideoTime = -1;

    const detectFrame = () => {
      if (!videoRef.current || !canvasRef.current || !poseLandmarkerRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(detectFrame);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const result = poseLandmarkerRef.current.detectForVideo(video, performance.now());

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (result.landmarks.length > 0) {
          const landmarks = result.landmarks[0];
          const drawUtils = new DrawingUtils(ctx);

          // Draw full skeleton dimly
          drawUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
            color: "rgba(0,200,80,0.25)", lineWidth: 2
          });

          // Highlight ankles and feet
          const ANKLE_L = 27, ANKLE_R = 28, FOOT_L = 31, FOOT_R = 32;
          const HEEL_L = 29, HEEL_R = 30;
          const footLandmarks = [ANKLE_L, ANKLE_R, FOOT_L, FOOT_R, HEEL_L, HEEL_R];
          for (const idx of footLandmarks) {
            const lm = landmarks[idx];
            const x = lm.x * canvas.width;
            const y = lm.y * canvas.height;
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(0,220,100,0.9)";
            ctx.fill();
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Juggle detection logic
          // We look at left ankle Y (normalized). A juggle = ankle rises then falls
          // (the foot goes up to kick the ball, then comes back down)
          const leftAnkle = landmarks[ANKLE_L];
          const rightAnkle = landmarks[ANKLE_R];

          fs.leftAnkleYPrev = fs.leftAnkleY;
          fs.rightAnkleYPrev = fs.rightAnkleY;
          fs.leftAnkleY = leftAnkle.y;
          fs.rightAnkleY = rightAnkle.y;

          if (fs.cooldown > 0) {
            fs.cooldown--;
          } else {
            // Detect upward peak on left foot (y decreasing = going up in screen)
            const leftDelta = fs.leftAnkleYPrev - fs.leftAnkleY; // positive = moving up
            const rightDelta = fs.rightAnkleYPrev - fs.rightAnkleY;

            const THRESHOLD = 0.018; // Minimum movement to count

            if (!fs.leftPeak && leftDelta > THRESHOLD) {
              fs.leftPeak = true;
            } else if (fs.leftPeak && leftDelta < -THRESHOLD) {
              // Peak detected — count a juggle
              fs.leftPeak = false;
              fs.cooldown = 8;
              const newCount = lastCountRef.current + 1;
              lastCountRef.current = newCount;
              setCount(newCount);
              setIsPulsing(true);
              setTimeout(() => setIsPulsing(false), 200);
              onCount(newCount);
              if (newCount >= maxCount) {
                stopCamera();
                onStop(maxCount);
                return;
              }
            }

            if (!fs.rightPeak && rightDelta > THRESHOLD) {
              fs.rightPeak = true;
            } else if (fs.rightPeak && rightDelta < -THRESHOLD) {
              fs.rightPeak = false;
              fs.cooldown = 8;
              const newCount = lastCountRef.current + 1;
              lastCountRef.current = newCount;
              setCount(newCount);
              setIsPulsing(true);
              setTimeout(() => setIsPulsing(false), 200);
              onCount(newCount);
              if (newCount >= maxCount) {
                stopCamera();
                onStop(maxCount);
                return;
              }
            }
          }

          // Draw count on canvas
          ctx.font = `bold 48px 'Clash Display', sans-serif`;
          ctx.fillStyle = "rgba(0,220,100,0.95)";
          ctx.strokeStyle = "rgba(0,0,0,0.8)";
          ctx.lineWidth = 4;
          ctx.textAlign = "right";
          ctx.strokeText(`${lastCountRef.current}`, canvas.width - 12, 56);
          ctx.fillText(`${lastCountRef.current}`, canvas.width - 12, 56);
        }
      }

      animFrameRef.current = requestAnimationFrame(detectFrame);
    };

    animFrameRef.current = requestAnimationFrame(detectFrame);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [state, maxCount, onCount, onStop, stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // When active prop changes
  useEffect(() => {
    if (!active) {
      stopCamera();
    }
  }, [active, stopCamera]);

  const handleReset = () => {
    lastCountRef.current = 0;
    setCount(0);
    footState.current = { leftAnkleY: 0, rightAnkleY: 0, leftAnkleYPrev: 0, rightAnkleYPrev: 0, leftPeak: false, rightPeak: false, cooldown: 0 };
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Camera viewport */}
      <div className="camera-container rounded-2xl overflow-hidden bg-black mb-4" style={{ aspectRatio: "4/3" }}>
        <video ref={videoRef} autoPlay muted playsInline style={{ transform: "scaleX(-1)", width: "100%", display: state === "running" ? "block" : "none" }} />
        <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", transform: "scaleX(-1)" }} />

        {/* Overlay states */}
        {state === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm">Loading AI tracker...</p>
          </div>
        )}
        {state === "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-card">
            <div className="text-5xl">📷</div>
            <div className="text-center">
              <p className="text-foreground font-bold">AI Juggling Tracker</p>
              <p className="text-muted-foreground text-sm mt-1">Point camera at the player</p>
            </div>
            <button
              onClick={startCamera}
              className="px-6 py-3 bg-primary text-primary-foreground font-display font-bold rounded-xl glow-green"
            >
              Start Camera
            </button>
          </div>
        )}
        {state === "nocamera" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card p-6 text-center">
            <div className="text-4xl">🚫</div>
            <p className="text-foreground font-bold">Camera Permission Denied</p>
            <p className="text-muted-foreground text-sm">Allow camera access to use the AI tracker</p>
          </div>
        )}
        {state === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card p-6 text-center">
            <div className="text-4xl">⚠️</div>
            <p className="text-foreground font-bold">Tracker unavailable</p>
            <p className="text-muted-foreground text-sm">Enter score manually below</p>
          </div>
        )}
        {state === "stopped" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-card">
            <div className={`juggle-count ${isPulsing ? "pulse" : ""}`}>{count}</div>
            <p className="text-muted-foreground text-sm">Final count — review and confirm</p>
          </div>
        )}
      </div>

      {/* Live count (while running) */}
      {state === "running" && (
        <div className="text-center mb-4">
          <div className={`juggle-count ${isPulsing ? "pulse" : ""}`}>{count}</div>
          <p className="text-muted-foreground text-xs uppercase tracking-widest mt-1">juggles detected</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3 justify-center">
        {state === "running" && (
          <>
            <button
              data-testid="button-stop-tracker"
              onClick={() => { stopCamera(); onStop(count); }}
              className="flex-1 py-3 bg-destructive text-destructive-foreground font-display font-bold rounded-xl text-lg"
            >
              ⏹ Stop
            </button>
            <button onClick={handleReset} className="px-5 py-3 bg-secondary border border-border rounded-xl text-muted-foreground font-bold">
              Reset
            </button>
          </>
        )}
        {(state === "stopped" || state === "error") && (
          <button
            onClick={() => { handleReset(); setState("ready"); }}
            className="px-6 py-3 bg-secondary border border-border rounded-xl text-foreground font-bold"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
