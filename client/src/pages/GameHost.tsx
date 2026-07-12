import { useState, useEffect, useRef } from "react";
import BrandHeader from "@/components/game/BrandHeader";
import ChallengeWheel, { WHEEL_SEGMENTS } from "@/components/game/ChallengeWheel";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { MODE_INFO, roundToLevel } from "../../../shared/schema";
import { useLang } from "../LanguageContext";
import type { Player, GameMode } from "../../../shared/schema";

type Finish = { id: number; playerId: number; position: number; points: number; finishedAt: number };

const MEDALS = ["🥇", "🥈", "🥉"];

// Map challenge level (1-5) to wheel segment index (0-4)
const LEVEL_TO_SEGMENT: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };

export default function GameHost() {
  const { roomId, playerId } = useParams();
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<"reveal" | "race" | "results">("reveal");
  const [resolvedState, setResolvedState] = useState<any>(null);
  const { T } = useLang();
  const [exitConfirm, setExitConfirm] = useState(false);

  // Wheel spin state for reveal phase
  const [wheelSpinning, setWheelSpinning] = useState(true);
  const [wheelDone, setWheelDone] = useState(false);
  const lastRoundRef = useRef<number | null>(null);

  const { data: state, refetch } = useQuery({
    queryKey: ["/api/rooms", roomId, "state"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/rooms/${roomId}/state`);
      return res.json();
    },
    refetchInterval: (query) => {
      const d = query.state.data as any;
      if (!d) return 1000;
      if (phase === "race") return 800;
      return false;
    },
  });

  const room = state?.room;
  const players: Player[] = state?.players || [];
  const currentRound = state?.currentRound;
  const finishes: Finish[] = state?.finishes || [];
  const mode = (room?.mode || "challenger") as GameMode;
  const modeInfo = MODE_INFO[mode];
  const me = players.find(p => p.id === Number(playerId));

  useEffect(() => {
    if (room?.currentPhase === "finished") navigate(`/winner/${roomId}`);
  }, [room?.currentPhase]);

  // When server advances to next round, reset local phase to reveal
  useEffect(() => {
    if (room?.currentPhase === "reveal" && phase === "results") {
      setResolvedState(null);
      setPhase("reveal");
      // Re-trigger wheel spin for new round
      setWheelDone(false);
      setWheelSpinning(true);
    }
  }, [room?.currentRound]);

  // Initialize wheel target on first load
  useEffect(() => {
    if (currentRound && lastRoundRef.current === null) {
      lastRoundRef.current = room?.currentRound ?? null;
    }
  }, [currentRound]);

  // Auto-advance to results when all players have finished
  useEffect(() => {
    if (phase === "race" && finishes.length > 0 && finishes.length >= players.length) {
      setPhase("results");
    }
  }, [finishes.length, players.length, phase]);

  // Host taps DONE mutation
  const doneMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/rooms/${roomId}/done`, { playerId: Number(playerId) });
      return res.json();
    },
    onSuccess: () => refetch(),
  });

  // Host manually resolves round (if not everyone tapped)
  const resolveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/rooms/${roomId}/resolve`);
      return res.json();
    },
    onSuccess: (data) => {
      setResolvedState(data);
      queryClient.invalidateQueries({ queryKey: ["/api/rooms", roomId, "state"] });
      setPhase("results");
    },
  });

  if (!state || !room) return (
    <div className="min-h-screen fun-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!currentRound) return (
    <div className="min-h-screen fun-bg flex items-center justify-center flex-col gap-4">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground text-sm font-body">Starting game...</p>
    </div>
  );

  const myFinish = finishes.find(f => f.playerId === Number(playerId));
  const finishedIds = new Set(finishes.map(f => f.playerId));

  // ── REVEAL ────────────────────────────────────────────────────────────────
  if (phase === "reveal") {
    const isLastRound = room.currentRound === room.maxRounds;
    const isCaptainFinal = isLastRound && room.mode === "captain";
    // Determine which wheel segment matches this challenge level
    const challengeLevel = roundToLevel(room.currentRound);
    const wheelTarget = LEVEL_TO_SEGMENT[challengeLevel] ?? 0;

    return (
      <div className="min-h-screen fun-bg flex flex-col">
        <BrandHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-5">
          <div className="max-w-sm w-full">

            {/* Round badge */}
            <div className="flex items-center justify-center gap-2 mb-5">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "hsl(215 12% 50%)" }}>
                Round {room.currentRound} of {room.maxRounds}
              </span>
              <span className="pill-badge" style={{ color: modeInfo.color, border: `1px solid ${modeInfo.color}50`, background: modeInfo.color + "15" }}>
                {modeInfo.emoji} {modeInfo.label}
              </span>
            </div>

            {/* ── WHEEL SPIN (shown until spin finishes) ── */}
            {!wheelDone ? (
              <div className="flex flex-col items-center gap-5 animate-slide-in">
                <div className="font-display text-lg text-white text-center" style={{ letterSpacing: "0.08em" }}>
                  🎰 DRAWING YOUR CHALLENGE…
                </div>
                <ChallengeWheel
                  spinning={wheelSpinning}
                  targetIndex={wheelTarget}
                  onDone={() => {
                    setWheelSpinning(false);
                    setWheelDone(true);
                  }}
                  size={280}
                />
                <p className="text-xs font-body" style={{ color: "hsl(215 12% 40%)" }}>
                  {WHEEL_SEGMENTS[wheelTarget].emoji} {WHEEL_SEGMENTS[wheelTarget].label} level incoming…
                </p>
              </div>
            ) : (
              /* ── CHALLENGE CARD (revealed after spin) ── */
              <div className="animate-slide-in">
                <div className="fun-card p-7 mb-5 text-center">
                  <div className="text-5xl mb-4">{isCaptainFinal ? "👑" : WHEEL_SEGMENTS[wheelTarget].emoji}</div>
                  {isCaptainFinal && (
                    <div className="font-display text-sm mb-2" style={{ color: "#eab308", letterSpacing: "0.15em" }}>{T.captainsFinal}</div>
                  )}
                  <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-3" style={{ background: WHEEL_SEGMENTS[wheelTarget].color + "20", border: `1px solid ${WHEEL_SEGMENTS[wheelTarget].color}50` }}>
                    <span className="font-display text-xs" style={{ color: WHEEL_SEGMENTS[wheelTarget].color }}>
                      {WHEEL_SEGMENTS[wheelTarget].label} CHALLENGE
                    </span>
                  </div>
                  <h2 className="font-display mb-3 leading-tight" style={{ fontSize: "clamp(1.4rem, 6vw, 2rem)", color: "#fff" }}>
                    {currentRound.challengeName.toUpperCase()}
                  </h2>
                  <div className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-display text-lg" style={{ background: "hsl(45 95% 55% / 0.15)", color: "hsl(45 95% 55%)" }}>
                    {T.target(currentRound.challengeTarget)}
                  </div>
                  <div className="mt-5 pt-5 border-t border-border text-left space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "hsl(215 12% 45%)" }}>Rules</p>
                    <p className="text-sm font-body" style={{ color: "hsl(215 12% 65%)" }}>
                      {T.rulesText(currentRound.challengeTarget)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    apiRequest("PATCH", `/api/rooms/${roomId}/phase`, { phase: "race" });
                    setPhase("race");
                    refetch();
                  }}
                  className="btn-yellow w-full glow-yellow text-xl py-5"
                >
                  {T.startRound}
                </button>

                <div className="mt-4 text-center">
                  {!exitConfirm ? (
                    <button onClick={() => setExitConfirm(true)} className="text-xs font-body" style={{ color: "hsl(215 12% 38%)" }}>
                      Exit game
                    </button>
                  ) : (
                    <div className="fun-card p-4 border border-red-500/30">
                      <p className="text-sm font-body mb-3" style={{ color: "hsl(215 12% 60%)" }}>{T.leaveConfirm}</p>
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

  // ── RESULTS ───────────────────────────────────────────────────────────────
  if (phase === "results") {
    // Use the finishes array from live state (may have been auto-resolved)
    const sortedFinishes = [...finishes].sort((a, b) => a.position - b.position);
    const isGameOver = room.currentPhase === "finished" || room.status === "finished";

    // Build a standings table: finished players by position, then unfinished at bottom (0pts)
    const finishedPlayers = sortedFinishes.map(f => ({
      player: players.find(p => p.id === f.playerId)!,
      finish: f,
    })).filter(x => x.player);
    const dnfPlayers = players
      .filter(p => !finishedIds.has(p.id))
      .map(p => ({ player: p, finish: null }));

    return (
      <div className="min-h-screen fun-bg flex flex-col">
        <BrandHeader />
        <div className="flex-1 p-5">
          <div className="max-w-sm mx-auto w-full">
            <div className="text-center mb-6 animate-slide-in">
              <div className="text-4xl mb-2">🏁</div>
              <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "hsl(215 12% 45%)" }}>
                Round {room.currentRound} · {currentRound.challengeName}
              </div>
              <h2 className="font-display text-3xl text-white">{T.roundOver}</h2>
            </div>

            {/* Finish order */}
            <div className="space-y-2 mb-6">
              {finishedPlayers.map(({ player, finish }, i) => (
                <div
                  key={player.id}
                  className="fun-card flex items-center gap-3 px-4 py-3 animate-slide-in"
                  style={{
                    borderColor: i === 0 ? "hsl(45 95% 55% / 0.5)" : undefined,
                    background: i === 0 ? "hsl(45 95% 55% / 0.08)" : undefined,
                    animationDelay: `${i * 0.06}s`,
                  }}
                >
                  <span className="text-2xl w-8 text-center">{MEDALS[i] || `${i + 1}`}</span>
                  <span className="text-2xl">{player.avatar}</span>
                  <span className="flex-1 font-display text-lg text-white">{player.name}</span>
                  <div className="text-right">
                    <div className="font-display text-xl" style={{ color: finish.points > 0 ? "hsl(45 95% 55%)" : "hsl(215 12% 45%)" }}>
                      +{finish.points} pts
                    </div>
                    <div className="text-xs font-body" style={{ color: "hsl(215 12% 45%)" }}>Total: {player.totalScore}</div>
                  </div>
                </div>
              ))}
              {dnfPlayers.map(({ player }) => (
                <div key={player.id} className="fun-card flex items-center gap-3 px-4 py-3 opacity-50">
                  <span className="text-xl w-8 text-center" style={{ color: "hsl(215 12% 40%)" }}>—</span>
                  <span className="text-2xl">{player.avatar}</span>
                  <span className="flex-1 font-display text-lg" style={{ color: "hsl(215 12% 60%)" }}>{player.name}</span>
                  <div className="font-display text-xl" style={{ color: "hsl(215 12% 40%)" }}>+0 pts</div>
                </div>
              ))}
            </div>

            {isGameOver ? (
              <button onClick={() => navigate(`/winner/${roomId}`)} className="btn-yellow w-full glow-yellow text-xl py-5">
                {T.seeTheCaptain}
              </button>
            ) : (
              <>
                <button
                  onClick={() => { refetch(); setPhase("reveal"); }}
                  className="btn-captains w-full glow-blue text-xl py-5"
                >
                  {T.nextRound}
                </button>

                {/* Exit game */}
                <div className="mt-4 text-center">
                  {!exitConfirm ? (
                    <button onClick={() => setExitConfirm(true)} className="text-xs font-body" style={{ color: "hsl(215 12% 38%)" }}>
                      Exit game
                    </button>
                  ) : (
                    <div className="fun-card p-4 border border-red-500/30 mt-2">
                      <p className="text-sm font-body mb-3" style={{ color: "hsl(215 12% 60%)" }}>Leave the game? This will end it for everyone.</p>
                      <div className="flex gap-2">
                        <button onClick={() => navigate("/")} className="flex-1 py-2 rounded-xl font-display text-sm" style={{ background: "hsl(0 72% 40%)", color: "#fff" }}>Leave</button>
                        <button onClick={() => setExitConfirm(false)} className="flex-1 py-2 rounded-xl border font-display text-sm" style={{ borderColor: "hsl(220 15% 28%)", color: "hsl(215 12% 65%)" }}>Stay</button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── RACE ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen fun-bg flex flex-col">
      <BrandHeader />
      <div className="flex-1 p-5 pb-6">
        <div className="max-w-sm mx-auto w-full flex flex-col gap-4">

          {/* Header */}
          <div className="text-center">
            <div className="text-xs font-body uppercase tracking-widest mb-1" style={{ color: "hsl(215 12% 45%)" }}>
              Round {room.currentRound}/{room.maxRounds} · {modeInfo.emoji} {modeInfo.label}
            </div>
            <h2 className="font-display text-2xl text-white leading-tight">
              {currentRound.challengeName}
            </h2>
            <div className="inline-flex items-center gap-2 mt-2 rounded-xl px-3 py-1.5 font-display text-sm" style={{ background: "hsl(45 95% 55% / 0.12)", color: "hsl(45 95% 55%)" }}>
              🎯 {currentRound.challengeTarget} touches to finish
            </div>
          </div>

          {/* DONE button — host taps when they finish */}
          {!myFinish ? (
            <button
              data-testid="button-done"
              onClick={() => doneMutation.mutate()}
              disabled={doneMutation.isPending}
              className="btn-yellow w-full glow-yellow disabled:opacity-50 py-7 text-2xl"
              style={{ borderRadius: "20px" }}
            >
              {doneMutation.isPending ? "Registering..." : "✅ DONE!"}
            </button>
          ) : (
            <div className="fun-card text-center py-6 animate-bounce-in" style={{ borderColor: "hsl(45 95% 55% / 0.4)", background: "hsl(45 95% 55% / 0.08)" }}>
              <div className="text-4xl mb-1">{MEDALS[myFinish.position - 1] || "✅"}</div>
              <div className="font-display text-xl" style={{ color: "hsl(45 95% 55%)" }}>
                You finished {myFinish.position === 1 ? "1st!" : myFinish.position === 2 ? "2nd!" : myFinish.position === 3 ? "3rd!" : `${myFinish.position}th!`}
              </div>
              <div className="text-sm font-body mt-1" style={{ color: "hsl(215 12% 50%)" }}>+{myFinish.points} pts · Waiting for others…</div>
            </div>
          )}

          {/* Live arrival board */}
          <div className="fun-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-display text-base text-white">Live Race</div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
                <span className="text-xs font-body" style={{ color: "hsl(215 12% 50%)" }}>
                  {T.finishedCount(finishes.length, players.length)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {/* Finished players in order */}
              {[...finishes]
                .sort((a, b) => a.position - b.position)
                .map(f => {
                  const p = players.find(pl => pl.id === f.playerId);
                  if (!p) return null;
                  return (
                    <div key={f.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 animate-slide-in" style={{ background: "hsl(220 16% 18%)" }}>
                      <span className="text-xl w-7 text-center">{MEDALS[f.position - 1] || `${f.position}`}</span>
                      <span className="text-xl">{p.avatar}</span>
                      <span className="flex-1 font-display text-base text-white">{p.name}</span>
                      <span className="font-display text-base" style={{ color: f.points > 0 ? "hsl(45 95% 55%)" : "hsl(215 12% 45%)" }}>
                        +{f.points}
                      </span>
                    </div>
                  );
                })}
              {/* Still racing players */}
              {players
                .filter(p => !finishedIds.has(p.id))
                .map(p => (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: "hsl(220 16% 15%)" }}>
                    <span className="text-xl w-7 text-center">⏳</span>
                    <span className="text-xl">{p.avatar}</span>
                    <span className="flex-1 font-display text-base" style={{ color: "hsl(215 12% 55%)" }}>{p.name}</span>
                    <span className="text-xs font-body animate-pulse" style={{ color: "hsl(215 12% 40%)" }}>racing…</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Host safety valve — end round early */}
          {finishes.length > 0 && finishes.length < players.length && (
            <button
              onClick={() => resolveMutation.mutate()}
              disabled={resolveMutation.isPending}
              className="w-full py-3 rounded-2xl font-display text-base transition-all"
              style={{ background: "hsl(220 16% 20%)", color: "hsl(215 12% 55%)", border: "1.5px solid hsl(220 15% 28%)" }}
            >
              {resolveMutation.isPending ? T.ending : T.endRoundEarly}
            </button>
          )}

        </div>
      </div>
    </div>
  );
}
