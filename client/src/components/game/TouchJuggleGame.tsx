import { useEffect, useMemo, useRef, useState } from "react";

type Move = "RIGHT" | "LEFT" | "THIGHS" | "ALTERNATING" | "LACES" | "INSIDE" | "OUTSIDE" | "BEST";

interface TouchJuggleGameProps {
  challengeName: string;
  target: number;
  color: string;
  avatar?: string;
  enabled?: boolean;
  onComplete: () => void;
}

const MOVE_INFO: Record<Move, { label: string; short: string; icon: string }> = {
  RIGHT: { label: "Right foot", short: "RIGHT", icon: "🦶" },
  LEFT: { label: "Left foot", short: "LEFT", icon: "🦶" },
  THIGHS: { label: "Thighs", short: "THIGHS", icon: "🦵" },
  ALTERNATING: { label: "Alternate feet", short: "ALT", icon: "↔️" },
  LACES: { label: "Laces", short: "LACES", icon: "👟" },
  INSIDE: { label: "Inside", short: "INSIDE", icon: "↪️" },
  OUTSIDE: { label: "Outside", short: "OUTSIDE", icon: "↩️" },
  BEST: { label: "Best foot", short: "BEST", icon: "⭐" },
};

const ALL_MOVES: Move[] = ["RIGHT", "LEFT", "THIGHS", "ALTERNATING", "LACES", "INSIDE", "OUTSIDE", "BEST"];

function parseSequence(name: string, target: number): Move[] {
  const upper = name.toUpperCase();
  const parts = upper.split("→").map(part => part.trim());
  const sequence: Move[] = [];

  for (const part of parts) {
    const count = Number(part.match(/(\d+)/)?.[1] ?? 0);
    const move = ALL_MOVES.find(m => part.includes(m));
    if (move && count > 0) sequence.push(...Array(count).fill(move));
  }

  if (sequence.length) {
    return Array.from({ length: target }, (_, i) => sequence[i % sequence.length]);
  }

  if (upper.includes("ALTERNATING")) {
    return Array.from({ length: target }, (_, i) => (i % 2 === 0 ? "RIGHT" : "LEFT"));
  }
  if (upper.includes("BEST FOOT")) return Array(target).fill("BEST");
  if (upper.includes("RIGHT FOOT")) return Array(target).fill("RIGHT");
  if (upper.includes("LEFT FOOT")) return Array(target).fill("LEFT");
  if (upper.includes("THIGHS")) return Array(target).fill("THIGHS");
  if (upper.includes("LACES")) return Array(target).fill("LACES");
  if (upper.includes("INSIDE")) return Array(target).fill("INSIDE");
  if (upper.includes("OUTSIDE")) return Array(target).fill("OUTSIDE");
  return Array(target).fill("BEST");
}

export default function TouchJuggleGame({
  challengeName,
  target,
  color,
  avatar = "🔵",
  enabled = true,
  onComplete,
}: TouchJuggleGameProps) {
  const sequence = useMemo(() => parseSequence(challengeName, target), [challengeName, target]);
  const availableMoves = useMemo(() => {
    const unique = Array.from(new Set(sequence));
    if (unique.includes("BEST")) return ["RIGHT", "LEFT"] as Move[];
    return unique.length === 1 && unique[0] === "ALTERNATING" ? (["RIGHT", "LEFT"] as Move[]) : unique;
  }, [sequence]);

  const [count, setCount] = useState(0);
  const [ballSide, setBallSide] = useState<"left" | "right">("right");
  const [feedback, setFeedback] = useState("Tap the correct move to juggle");
  const [flash, setFlash] = useState<"good" | "miss" | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    setCount(0);
    setBallSide("right");
    setFeedback("Tap the correct move to juggle");
    setFlash(null);
    completedRef.current = false;
  }, [challengeName, target]);

  const expected = sequence[Math.min(count, sequence.length - 1)] ?? "BEST";
  const expectedLabel = expected === "BEST" ? "RIGHT OR LEFT" : MOVE_INFO[expected].short;
  const pct = Math.min(100, (count / target) * 100);

  const tapMove = (move: Move) => {
    if (!enabled || completedRef.current) return;
    const correct = expected === "BEST" ? move === "RIGHT" || move === "LEFT" : move === expected;

    if (!correct) {
      setFlash("miss");
      setFeedback(`Try ${expectedLabel} — your progress stays!`);
      window.setTimeout(() => setFlash(null), 220);
      return;
    }

    const next = count + 1;
    setCount(next);
    setBallSide(move === "LEFT" ? "left" : move === "RIGHT" ? "right" : ballSide === "left" ? "right" : "left");
    setFlash("good");
    setFeedback(next >= target ? "Challenge complete!" : "Great touch!");
    window.setTimeout(() => setFlash(null), 180);

    if (next >= target && !completedRef.current) {
      completedRef.current = true;
      window.setTimeout(onComplete, 350);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 select-none" style={{ touchAction: "manipulation" }}>
      <div
        className={`relative overflow-hidden rounded-3xl ${flash === "miss" ? "animate-wiggle" : ""}`}
        style={{
          minHeight: "310px",
          background: "linear-gradient(180deg, hsl(220 35% 18%), hsl(220 24% 10%))",
          border: `2px solid ${flash === "miss" ? "#ef4444" : color + "70"}`,
          boxShadow: flash === "good" ? `0 0 34px ${color}65` : `0 14px 38px rgba(0,0,0,.3)`,
        }}
      >
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20">
          <div className="rounded-full px-3 py-1 font-display text-sm" style={{ background: "rgba(5,8,18,.75)", color: "#fff" }}>
            NEXT: <span style={{ color }}>{expectedLabel}</span>
          </div>
          <div className="rounded-full px-3 py-1 font-display text-lg" style={{ background: "rgba(5,8,18,.75)", color }}>
            {count}/{target}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-20" style={{ background: "linear-gradient(180deg, transparent, rgba(34,197,94,.18))" }} />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-10 flex flex-col items-center">
          <div className="text-5xl mb-[-5px] drop-shadow-lg">{avatar}</div>
          <div className="relative w-24 h-32">
            <div className="absolute left-1/2 -translate-x-1/2 top-0 w-12 h-16 rounded-[45%]" style={{ background: color }} />
            <div className="absolute left-[21px] top-14 w-4 h-58 rounded-full origin-top rotate-6" style={{ height: 62, background: "#d7b18a" }} />
            <div className="absolute right-[21px] top-14 w-4 rounded-full origin-top -rotate-6" style={{ height: 62, background: "#d7b18a" }} />
            <div className="absolute left-[25px] top-[105px] w-5 rounded-full origin-top rotate-12" style={{ height: 66, background: "#d7b18a" }} />
            <div className="absolute right-[25px] top-[105px] w-5 rounded-full origin-top -rotate-12" style={{ height: 66, background: "#d7b18a" }} />
          </div>
        </div>

        <div
          className="absolute text-5xl z-10 transition-all duration-150"
          style={{
            left: ballSide === "left" ? "22%" : "65%",
            bottom: flash === "good" ? "155px" : "65px",
            transform: flash === "good" ? "rotate(25deg) scale(1.08)" : "rotate(0deg)",
            filter: "drop-shadow(0 8px 8px rgba(0,0,0,.45))",
          }}
        >
          ⚽
        </div>

        <div className="absolute bottom-3 inset-x-3 text-center text-xs font-body" style={{ color: flash === "miss" ? "#fca5a5" : "hsl(215 12% 65%)" }}>
          {feedback}
        </div>
      </div>

      <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "hsl(220 16% 18%)" }}>
        <div className="h-full rounded-full transition-all duration-200" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 12px ${color}` }} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {availableMoves.map(move => (
          <button
            key={move}
            type="button"
            disabled={!enabled || completedRef.current}
            onPointerDown={e => { e.preventDefault(); tapMove(move); }}
            className="rounded-2xl px-3 py-5 active:scale-95 transition-transform disabled:opacity-50"
            style={{
              background: expected === move || expected === "BEST" ? color : "hsl(220 16% 17%)",
              color: expected === move || expected === "BEST" ? "#fff" : "hsl(215 12% 72%)",
              border: `1.5px solid ${expected === move || expected === "BEST" ? color : "hsl(220 15% 27%)"}`,
              boxShadow: expected === move || expected === "BEST" ? `0 7px 22px ${color}45` : "none",
            }}
          >
            <div className="text-2xl mb-1">{MOVE_INFO[move].icon}</div>
            <div className="font-display text-lg">{MOVE_INFO[move].label}</div>
          </button>
        ))}
      </div>

      <div className="text-center text-xs font-body px-3" style={{ color: "hsl(215 12% 46%)" }}>
        Wrong tap? Keep going — completed touches never reset.
      </div>
    </div>
  );
}
