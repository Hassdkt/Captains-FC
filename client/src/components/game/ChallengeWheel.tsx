/**
 * ChallengeWheel
 *
 * A spinning SVG wheel with 5 colored segments — one per challenge level.
 * Used on:
 *   - Home page: static / slow idle spin, showing what challenges look like
 *   - Reveal phase: fast spin that decelerates and lands on the actual challenge
 *
 * Props:
 *   spinning     – true = play spin animation
 *   targetIndex  – which segment to land on (0-based, matches WHEEL_SEGMENTS)
 *   onDone       – called when the spin animation finishes
 *   size         – diameter in px (default 300)
 *   idle         – true = slow continuous spin (home page mode)
 */

import { useEffect, useRef, useState } from "react";

export interface WheelSegment {
  label: string;
  sublabel: string;
  color: string;
  bg: string;
  emoji: string;
}

// 8 individual moves shown on the wheel, color-coded by difficulty
export const WHEEL_SEGMENTS: WheelSegment[] = [
  { label: "RIGHT FOOT",   sublabel: "One foot only",        color: "#22d3ee", bg: "#0b3540", emoji: "👟" },
  { label: "LEFT FOOT",    sublabel: "One foot only",        color: "#22d3ee", bg: "#0b3540", emoji: "👟" },
  { label: "BEST FOOT",    sublabel: "Your stronger foot",   color: "#22c55e", bg: "#0a2e14", emoji: "⭐" },
  { label: "ALTERNATING",  sublabel: "R → L → R → L…",     color: "#22c55e", bg: "#0a2e14", emoji: "🔄" },
  { label: "INSIDE ONLY",  sublabel: "Inside of foot",       color: "#f97316", bg: "#3a1505", emoji: "🔥" },
  { label: "OUTSIDE ONLY", sublabel: "Outside of foot",      color: "#f97316", bg: "#3a1505", emoji: "🔥" },
  { label: "LACES ONLY",   sublabel: "Top of foot",          color: "#a855f7", bg: "#240d40", emoji: "⚡" },
  { label: "LACES→IN→OUT", sublabel: "Combo sequence",       color: "#eab308", bg: "#2e2202", emoji: "👑" },
];

const NUM = WHEEL_SEGMENTS.length; // 8
const SLICE = (2 * Math.PI) / NUM; // radians per segment

interface ChallengeWheelProps {
  spinning?: boolean;
  targetIndex?: number;
  onDone?: () => void;
  size?: number;
  idle?: boolean;
}

export default function ChallengeWheel({
  spinning = false,
  targetIndex = 0,
  onDone,
  size = 300,
  idle = false,
}: ChallengeWheelProps) {
  const [rotation, setRotation] = useState(0);       // degrees
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const startAngleRef = useRef<number>(0);
  const doneRef = useRef(false);

  // Idle slow spin
  useEffect(() => {
    if (!idle || spinning) return;
    let frame: number;
    let start: number | null = null;
    const animate = (ts: number) => {
      if (start === null) start = ts;
      const elapsed = ts - start;
      setRotation((elapsed * 0.02) % 360); // ~20 deg/s
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [idle, spinning]);

  // Spin-to-target animation
  useEffect(() => {
    if (!spinning) return;
    doneRef.current = false;

    // Each segment sits at: segmentIndex * (360/5) + half-slice offset
    // We want the pointer (top = 270° in SVG space, but we offset wheel by -90°
    // so segment 0 starts at top) to land on targetIndex.
    // Landing angle = -(targetIndex * sliceDeg + sliceDeg/2)
    const sliceDeg = 360 / NUM;
    const landingAngle = -(targetIndex * sliceDeg + sliceDeg / 2);

    // Spin 5 full rotations + land
    const totalRotation = 5 * 360 + ((landingAngle % 360) + 360) % 360;
    const duration = 3200; // ms

    startTimeRef.current = performance.now();
    startAngleRef.current = rotation % 360;

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / duration, 1);
      const angle = startAngleRef.current + totalRotation * easeOut(t);
      setRotation(angle);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        if (!doneRef.current) {
          doneRef.current = true;
          onDone?.();
        }
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning, targetIndex]);

  const cx = size / 2;
  const cy = size / 2;
  const r  = size / 2 - 6; // inner radius with a small gap for the border ring

  // Build SVG arc paths for each segment
  const segments = WHEEL_SEGMENTS.map((seg, i) => {
    const startAngle = i * SLICE - Math.PI / 2;       // start from top
    const endAngle   = startAngle + SLICE;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);

    const largeArc = SLICE > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    // Label position — midpoint of arc at 65% radius
    const midAngle = startAngle + SLICE / 2;
    const labelR   = r * 0.62;
    const lx = cx + labelR * Math.cos(midAngle);
    const ly = cy + labelR * Math.sin(midAngle);
    const emojiR = r * 0.85;
    const ex = cx + emojiR * Math.cos(midAngle);
    const ey = cy + emojiR * Math.sin(midAngle);

    return { ...seg, path, lx, ly, ex, ey, midAngle };
  });

  const pointerSize = size * 0.07;

  return (
    <div className="relative select-none" style={{ width: size, height: size }}>
      {/* Outer glow ring */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: "transparent",
          boxShadow: "0 0 40px rgba(234,179,8,0.25), 0 0 80px rgba(34,211,238,0.1)",
          borderRadius: "50%",
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? undefined : idle ? undefined : "none",
          display: "block",
        }}
      >
        {/* Dark background circle */}
        <circle cx={cx} cy={cy} r={r + 5} fill="hsl(220 20% 8%)" />

        {/* Segments */}
        {segments.map((seg, i) => {
          // Rotate text group so it reads from center outward along the midAngle
          const rotDeg = (seg.midAngle * 180) / Math.PI;
          return (
            <g key={i}>
              <path d={seg.path} fill={seg.bg} stroke="hsl(220 20% 8%)" strokeWidth="1.5" />
              {/* Colored outer arc */}
              <path
                d={`M ${cx + (r - 1) * Math.cos(i * SLICE - Math.PI / 2)} ${cy + (r - 1) * Math.sin(i * SLICE - Math.PI / 2)} A ${r - 1} ${r - 1} 0 0 1 ${cx + (r - 1) * Math.cos((i + 1) * SLICE - Math.PI / 2)} ${cy + (r - 1) * Math.sin((i + 1) * SLICE - Math.PI / 2)}`}
                fill="none"
                stroke={seg.color}
                strokeWidth="4"
                strokeOpacity="0.75"
              />

              {/* Emoji at outer ring */}
              <text
                x={seg.ex}
                y={seg.ey}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={size * 0.055}
                style={{ userSelect: "none" }}
              >
                {seg.emoji}
              </text>

              {/* Label — rotated to read outward */}
              <g transform={`rotate(${rotDeg}, ${seg.lx}, ${seg.ly})`}>
                <text
                  x={seg.lx}
                  y={seg.ly - size * 0.018}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={seg.color}
                  fontSize={size * 0.042}
                  fontWeight="800"
                  fontFamily="'Barlow Condensed', sans-serif"
                  letterSpacing="0.04em"
                  style={{ userSelect: "none" }}
                >
                  {seg.label}
                </text>
                <text
                  x={seg.lx}
                  y={seg.ly + size * 0.026}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="rgba(255,255,255,0.38)"
                  fontSize={size * 0.027}
                  fontFamily="'Barlow', sans-serif"
                  style={{ userSelect: "none" }}
                >
                  {seg.sublabel}
                </text>
              </g>
            </g>
          );
        })}

        {/* Center hub */}
        <circle cx={cx} cy={cy} r={size * 0.08} fill="hsl(220 20% 10%)" stroke="hsl(220 15% 22%)" strokeWidth="2" />
        <circle cx={cx} cy={cy} r={size * 0.04} fill="hsl(45 95% 55%)" />
      </svg>

      {/* Pointer triangle — fixed at top, doesn't rotate with wheel */}
      <div
        className="absolute left-1/2 pointer-events-none"
        style={{
          top: -pointerSize * 0.3,
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: `${pointerSize * 0.55}px solid transparent`,
          borderRight: `${pointerSize * 0.55}px solid transparent`,
          borderTop: `${pointerSize * 1.1}px solid hsl(45 95% 55%)`,
          filter: "drop-shadow(0 2px 6px rgba(234,179,8,0.7))",
          zIndex: 10,
        }}
      />
    </div>
  );
}
