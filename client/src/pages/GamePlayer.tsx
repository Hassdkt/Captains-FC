import BrandHeader from "@/components/game/BrandHeader";
import TouchJuggleGame from "@/components/game/TouchJuggleGame";
import ChallengeWheel, { WHEEL_SEGMENTS } from "@/components/game/ChallengeWheel";
import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MODE_INFO, roundToLevel } from "../../../shared/schema";
import { useLang } from "../LanguageContext";
import type { Player, GameMode } from "../../../shared/schema";

const LEVEL_TO_SEGMENT: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };

type Finish = { id: number; playerId: number; position: number; points: number; finishedAt: number };

const MEDALS = ["🥇", "🥈", "🥉"];

export default function GamePlayer() {
  const { roomId, playerId } = useParams();
  const [, navigate] = useLocation();
  const [exitConfirm, setExitConfirm] = useState(false);
  const { T } = useLang();

  // Wheel spin state for reveal phase
  const [wheelSpinning, setWheelSpinning] = useState(true);
  const [wheelDone, setWheelDone] = useState(false);
  const lastRoundRef = useRef<number | null>(null);

  // Re-trigger wheel on new round
  useEffect(() => {
    if (room?.currentRound && room.currentRound !== lastRoundRef.current) {
      lastRoundRef.current = room.currentRound;
      setWheelDone(false);
      setWheelSpinning(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.currentRound]);

  const { data: state, refetch } = useQuery({
    queryKey: ["/api/rooms", roomId, "state"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/rooms/${roomId}/state`);
      return res.json();
    },
    refetchInterval: 800,
  });

  const room = state?.room;
  const players: Player[] = state?.players || [];
  const currentRound = state?.currentRound;
  const finishes: Finish[] = state?.finishes || [];
  const me = players.find(p => p.id === Number(playerId));
  const mode = (room?.mode || "challenger") as GameMode;
  const modeInfo = MODE_INFO[mode];

  useEffect(() => {
    if (room?.currentPhase === "finished") navigate(`/winner/${roomId}`);
  }, [room?.currentPhase]);

  const myFinish = finishes.find(f => f.playerId === Number(playerId));
  const finishedIds = new Set(finishes.map(f => f.playerId));

  // DONE tap
  const doneMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/rooms/${roomId}/done`, { playerId: Number(playerId) });
      return res.json();
    },
    onSuccess: () => refetch(),
  });

  if (!state || !room || !me) {
    return (
      <div className="min-h-screen fun-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const phase = room.currentPhase;
  const isReveal = phase === "reveal";
  const isRace = phase === "race";

  // ── REVEAL PHASE — waiting for host to start ─────────────────────────────
  if (isReveal) {
    const isCaptainFinal = room.currentRound === room.maxRounds && mode === "captain";
    const challengeLevel = roundToLevel(room.currentRound);
    const wheelTarget = LEVEL_TO_SEGMENT[challengeLevel] ?? 0;
    return (
      <div className="min-h-screen fun-bg flex flex-col">
        <BrandHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-5">
          <div className="max-w-sm w-full text-center">

            <div className="flex items-center justify-center gap-2 mb-5">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "hsl(215 12% 50%)" }}>
                Round {room.currentRound} of {room.maxRounds}
              </span>
              <span className="pill-badge" style={{ color: modeInfo.color, border: `1px solid ${modeInfo.color}50`, background: modeInfo.color + "15" }}>
                {modeInfo.emoji} {modeInfo.label}
              </span>
            </div>

            {/* ── WHEEL SPIN ── */}
            {!wheelDone ? (
              <div className="flex flex-col items-center gap-5 animate-slide-in">
                <div className="font-display text-lg text-white" style={{ letterSpacing: "0.08em" }}>
                  🎰 DRAWING YOUR CHALLENGE…
                </div>
                <ChallengeWheel
                  spinning={wheelSpinning}
                  targetIndex={wheelTarget}
                  onDone={() => { setWheelSpinning(false); setWheelDone(true); }}
                  size={260}
                />
              </div>
            ) : (
              /* ── CHALLENGE REVEALED ── */
              <div className="animate-slide-in">
                {currentRound ? (
                  <div className="fun-card p-6 mb-5 text-center">
                    <div className="text-4xl mb-3">{isCaptainFinal ? "👑" : WHEEL_SEGMENTS[wheelTarget].emoji}</div>
                    {isCaptainFinal && (
                      <div className="font-display text-sm mb-2" style={{ color: "#eab308", letterSpacing: "0.15em" }}>{T.captainsFinal}</div>
                    )}
                    <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-3" style={{ background: WHEEL_SEGMENTS[wheelTarget].color + "20", border: `1px solid ${WHEEL_SEGMENTS[wheelTarget].color}50` }}>
                      <span className="font-display text-xs" style={{ color: WHEEL_SEGMENTS[wheelTarget].color }}>
                        {WHEEL_SEGMENTS[wheelTarget].label} CHALLENGE
                      </span>
                    </div>
                    <h2 className="font-display mb-3 leading-tight" style={{ fontSize: "clamp(1.3rem, 5.5vw, 1.8rem)", color: "#fff" }}>
                      {currentRound.challengeName.toUpperCase()}
                    </h2>
                    <div className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 font-display text-base" style={{ background: "hsl(45 95% 55% / 0.12)", color: "hsl(45 95% 55%)" }}>
                      🎯 {currentRound.challengeTarget} touches
                    </div>
                  </div>
                ) : (
                  <div className="fun-card p-8 mb-5">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="font-body text-sm" style={{ color: "hsl(215 12% 50%)" }}>Loading challenge…</p>
                  </div>
                )}

                <div className="fun-card p-4 mb-4">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: modeInfo.color }} />
                    <p className="font-display text-base" style={{ color: "hsl(215 12% 60%)" }}>
                      {T.waitingForHostToStart}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 mb-5">
                  <span className="text-2xl">{me.avatar}</span>
                  <span className="font-display text-lg text-white">{me.name}</span>
                  <span className="font-display text-lg" style={{ color: "hsl(45 95% 55%)" }}>{me.totalScore} pts</span>
                </div>

                <div>
                  {!exitConfirm ? (
                    <button onClick={() => setExitConfirm(true)} className="text-xs font-body" style={{ color: "hsl(215 12% 38%)" }}>
                      Exit game
                    </button>
                  ) : (
                    <div className="fun-card p-4 border border-red-500/30 text-left">
                      <p className="text-sm font-body mb-3" style={{ color: "hsl(215 12% 60%)" }}>{T.quitConfirm}</p>
                      <div className="flex gap-2">
                        <button onClick={() => navigate("/")} className="flex-1 py-2 rounded-xl font-display text-sm" style={{ background: "hsl(0 72% 40%)", color: "#fff" }}>{T.leave}</button>
                        <button onClick={() => setExitConfirm(false)} className="flex-1 py-2 rounded-xl border font-display text-sm" style={{ borderColor: "hsl(220 15% 28%)", color: "hsl(215 12% 65%)" }}>{T.stay}</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── RACE PHASE ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen fun-bg flex flex-col">
      <BrandHeader />
      <div className="flex-1 p-5 pb-8">
        <div className="max-w-sm mx-auto w-full flex flex-col gap-4">

          {/* Header */}
          <div className="text-center">
            <div className="text-xs font-body uppercase tracking-widest mb-1" style={{ color: "hsl(215 12% 45%)" }}>
              Round {room.currentRound}/{room.maxRounds} · {modeInfo.emoji} {modeInfo.label}
            </div>
            {currentRound && (
              <>
                <h2 className="font-display text-xl text-white leading-tight">{currentRound.challengeName}</h2>
                <div className="inline-flex items-center gap-2 mt-2 rounded-xl px-3 py-1.5 font-display text-sm" style={{ background: "hsl(45 95% 55% / 0.12)", color: "hsl(45 95% 55%)" }}>
                  🎯 {currentRound.challengeTarget} touches to finish
                </div>
              </>
            )}
          </div>

          {/* Touch game or finish confirmation */}
          {!myFinish ? (
            <TouchJuggleGame
              challengeName={currentRound?.challengeName ?? "BEST FOOT — 10 TOUCHES"}
              target={currentRound?.challengeTarget ?? 10}
              color={modeInfo.color}
              avatar={me.avatar}
              onComplete={() => { if (!doneMutation.isPending) doneMutation.mutate(); }}
              enabled={isRace && !myFinish && !doneMutation.isPending}
            />
          ) : (
            <div className="fun-card text-center py-7 animate-bounce-in" style={{ borderColor: "hsl(45 95% 55% / 0.4)", background: "hsl(45 95% 55% / 0.08)" }}>
              <div className="text-5xl mb-2">{MEDALS[myFinish.position - 1] || "✅"}</div>
              <div className="font-display text-2xl" style={{ color: "hsl(45 95% 55%)" }}>
                {myFinish.position === 1 ? "You're FIRST! 🔥" : myFinish.position === 2 ? "2nd Place! 💪" : myFinish.position === 3 ? "3rd Place!" : `${myFinish.position}th Place`}
              </div>
              <div className="font-display text-xl mt-1" style={{ color: "hsl(215 12% 65%)" }}>+{myFinish.points} pts</div>
              <div className="text-sm font-body mt-2" style={{ color: "hsl(215 12% 45%)" }}>Waiting for others to finish…</div>
            </div>
          )}

          {/* Live arrival board */}
          <div className="fun-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-display text-base text-white">Live Race</div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
                <span className="text-xs font-body" style={{ color: "hsl(215 12% 50%)" }}>
                  {finishes.length}/{players.length} finished
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {[...finishes]
                .sort((a, b) => a.position - b.position)
                .map(f => {
                  const p = players.find(pl => pl.id === f.playerId);
                  if (!p) return null;
                  const isMe = p.id === Number(playerId);
                  return (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 animate-slide-in"
                      style={{ background: isMe ? "hsl(45 95% 55% / 0.1)" : "hsl(220 16% 18%)", borderLeft: isMe ? "2px solid hsl(45 95% 55%)" : "2px solid transparent" }}
                    >
                      <span className="text-xl w-7 text-center">{MEDALS[f.position - 1] || `${f.position}`}</span>
                      <span className="text-xl">{p.avatar}</span>
                      <span className="flex-1 font-display text-base" style={{ color: isMe ? "hsl(45 95% 55%)" : "#fff" }}>
                        {p.name}{isMe ? " (you)" : ""}
                      </span>
                      <span className="font-display text-base" style={{ color: f.points > 0 ? "hsl(45 95% 55%)" : "hsl(215 12% 45%)" }}>
                        +{f.points}
                      </span>
                    </div>
                  );
                })}
              {players
                .filter(p => !finishedIds.has(p.id))
                .map(p => {
                  const isMe = p.id === Number(playerId);
                  return (
                    <div key={p.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: "hsl(220 16% 15%)" }}>
                      <span className="text-xl w-7 text-center">⏳</span>
                      <span className="text-xl">{p.avatar}</span>
                      <span className="flex-1 font-display text-base" style={{ color: isMe ? "hsl(220 88% 65%)" : "hsl(215 12% 55%)" }}>
                        {p.name}{isMe ? " (you)" : ""}
                      </span>
                      <span className="text-xs font-body animate-pulse" style={{ color: "hsl(215 12% 40%)" }}>{T.racing}</span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Total score */}
          <div className="text-center">
            <span className="text-xs font-body uppercase tracking-widest" style={{ color: "hsl(215 12% 40%)" }}>{T.yourTotal}</span>
            <div className="font-display text-3xl" style={{ color: "hsl(45 95% 55%)" }}>{me.totalScore} pts</div>
          </div>

        </div>
      </div>
    </div>
  );
}
