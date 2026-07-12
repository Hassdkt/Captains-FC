import BrandHeader from "@/components/game/BrandHeader";
import TouchJuggleGame from "@/components/game/TouchJuggleGame";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useLang } from "../LanguageContext";
import { apiRequest } from "@/lib/queryClient";
import {
  MODE_INFO,
  CHALLENGE_POOLS,
  AVATARS,
  pickChallenge,
} from "../../../shared/schema";
import type { GameMode, Challenge } from "../../../shared/schema";

// ─── Solo scoring ─────────────────────────────────────────────────────────────
// Each round: max 5 pts based on how fast you finish vs. a par time
// Par time = target × 1.5 seconds (e.g. 10 touches → 15s par)
// <50% of par  → 5 pts
// 50–75% of par → 4 pts
// 75–100% of par → 3 pts
// 100–150% of par → 2 pts
// >150% of par → 1 pt (you finished — participation matters)
function calcPoints(challenge: Challenge, elapsedMs: number): { points: number; label: string; color: string } {
  const parMs = challenge.target * 1500; // par in ms
  const ratio = elapsedMs / parMs;
  if (ratio < 0.5)  return { points: 5, label: "⚡ LIGHTNING!", color: "#eab308" };
  if (ratio < 0.75) return { points: 4, label: "🔥 BLAZING!", color: "#f97316" };
  if (ratio < 1.0)  return { points: 3, label: "✅ SOLID!", color: "#22c55e" };
  if (ratio < 1.5)  return { points: 2, label: "👍 DONE!", color: "#3b82f6" };
  return               { points: 1, label: "💪 FINISHED!", color: "#a855f7" };
}

// ─── Screens ──────────────────────────────────────────────────────────────────
type Screen = "setup" | "mode" | "ready" | "race" | "result" | "summary";

interface RoundResult {
  challenge: Challenge;
  elapsedMs: number;
  points: number;
  label: string;
  color: string;
}

export default function SoloGame() {
  const [, navigate] = useLocation();
  const [screen, setScreen] = useState<Screen>("setup");

  // Player profile
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🔵");

  // Game state
  const [mode, setMode] = useState<GameMode>("challenger");
  const [currentRound, setCurrentRound] = useState(0);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [totalScore, setTotalScore] = useState(0);

  // Timer
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Leaderboard submit
  const [submitted, setSubmitted] = useState(false);
  const [exitConfirm, setExitConfirm] = useState(false);
  const { T } = useLang();

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/solo/leaderboard", {
        mode: `solo_${mode}`,
        name,
        avatar,
        score: totalScore,
      });
      return res.json();
    },
    onSuccess: () => setSubmitted(true),
  });

  // Build challenge list when mode is picked
  const buildChallenges = useCallback((m: GameMode) => {
    const rounds = MODE_INFO[m].rounds;
    return Array.from({ length: rounds }, (_, i) => pickChallenge(i + 1));
  }, []);

  const startTimer = () => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 100);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    return Date.now() - startTimeRef.current;
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const tenth = Math.floor((ms % 1000) / 100);
    return `${s}.${tenth}s`;
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleStartMode = (m: GameMode) => {
    setMode(m);
    const ch = buildChallenges(m);
    setChallenges(ch);
    setCurrentRound(0);
    setResults([]);
    setTotalScore(0);
    setSubmitted(false);
    setScreen("ready");
  };

  const handleStartRound = () => {
    setElapsedMs(0);
    startTimer();
    setScreen("race");
  };

  const handleDone = () => {
    const elapsed = stopTimer();
    const challenge = challenges[currentRound];
    const { points, label, color } = calcPoints(challenge, elapsed);
    const result: RoundResult = { challenge, elapsedMs: elapsed, points, label, color };
    const newResults = [...results, result];
    const newTotal = totalScore + points;
    setResults(newResults);
    setTotalScore(newTotal);
    setElapsedMs(elapsed);
    setScreen("result");
  };

  const handleNextRound = () => {
    const next = currentRound + 1;
    if (next >= challenges.length) {
      setScreen("summary");
    } else {
      setCurrentRound(next);
      setScreen("ready");
    }
  };

  const handleRestart = () => {
    setScreen("mode");
  };

  const mi = MODE_INFO[mode];
  const challenge = challenges[currentRound];
  const lastResult = results[results.length - 1];

  // ── Setup screen ─────────────────────────────────────────────────────────────
  if (screen === "setup") {
    return (
      <div className="min-h-screen fun-bg flex flex-col">
        <BrandHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="max-w-sm w-full animate-slide-in">
            <div className="text-center mb-8">
              <div className="text-5xl mb-3">🧘</div>
              <h2 className="font-display text-3xl font-bold text-white">{T.soloPracticeTitle}</h2>
              <p className="text-sm font-body mt-2" style={{ color: "hsl(215 12% 55%)" }}>
                {T.soloSubTitle}
              </p>
            </div>

            <div className="fun-card p-6 mb-4">
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 font-body" style={{ color: "hsl(215 12% 50%)" }}>
                {T.soloNameLabel}
              </label>
              <input
                data-testid="input-solo-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="{T.soloNamePlaceholder}"
                maxLength={20}
                className="w-full bg-transparent border rounded-xl px-4 py-3 font-display text-white text-lg placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                style={{ borderColor: "hsl(220 15% 28%)" }}
              />
            </div>

            <div className="fun-card p-6 mb-6">
              <label className="block text-xs font-bold uppercase tracking-widest mb-3 font-body" style={{ color: "hsl(215 12% 50%)" }}>
                {T.pickAvatar}
              </label>
              <div className="flex gap-3 justify-center flex-wrap">
                {AVATARS.map(a => (
                  <button
                    key={a}
                    data-testid={`avatar-${a}`}
                    onClick={() => setAvatar(a)}
                    className="text-3xl rounded-2xl p-2 transition-all"
                    style={{
                      background: avatar === a ? "hsl(220 88% 57% / 0.2)" : "hsl(220 16% 18%)",
                      border: `2px solid ${avatar === a ? "hsl(220 88% 57%)" : "transparent"}`,
                      transform: avatar === a ? "scale(1.2)" : "scale(1)",
                    }}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <button
              data-testid="button-solo-continue"
              onClick={() => name.trim() ? setScreen("mode") : undefined}
              disabled={!name.trim()}
              className="btn-yellow w-full glow-yellow text-xl py-5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {T.letsGoBtn}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Mode selection ────────────────────────────────────────────────────────────
  if (screen === "mode") {
    return (
      <div className="min-h-screen fun-bg flex flex-col">
        <BrandHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="max-w-sm w-full animate-slide-in">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">{avatar}</div>
              <h2 className="font-display text-2xl font-bold text-white">{name.toUpperCase()}</h2>
              <p className="text-sm font-body mt-1" style={{ color: "hsl(215 12% 55%)" }}>
                {T.chooseDifficulty}
              </p>
            </div>

            <div className="space-y-3">
              {(["discovery", "challenger", "baller", "captain"] as GameMode[]).map(m => {
                const info = MODE_INFO[m];
                return (
                  <button
                    key={m}
                    data-testid={`mode-${m}`}
                    onClick={() => handleStartMode(m)}
                    className="w-full fun-card p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ border: `1.5px solid ${info.color}40` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{info.emoji}</span>
                        <div>
                          <div className="font-display text-lg font-bold" style={{ color: info.color }}>
                            {info.label.toUpperCase()}
                          </div>
                          <div className="text-xs font-body mt-0.5" style={{ color: "hsl(215 12% 50%)" }}>
                            {info.rounds} round{info.rounds !== 1 ? "s" : ""} · {info.duration}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-body" style={{ color: "hsl(215 12% 45%)" }}>
                          {info.tagline}
                        </div>
                        <div className="font-display font-bold text-sm mt-0.5" style={{ color: info.color }}>
                          {T.maxPts(info.rounds * 5)}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Ready screen ──────────────────────────────────────────────────────────────
  if (screen === "ready" && challenge) {
    const roundNum = currentRound + 1;
    const totalRounds = challenges.length;
    return (
      <div className="min-h-screen fun-bg flex flex-col">
        <BrandHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="max-w-sm w-full text-center animate-slide-in">

            {/* Progress */}
            <div className="flex gap-1.5 justify-center mb-6">
              {challenges.map((_, i) => (
                <div key={i} className="h-2 flex-1 rounded-full transition-all"
                  style={{ background: i < currentRound ? mi.color : i === currentRound ? mi.color + "80" : "hsl(220 16% 22%)" }} />
              ))}
            </div>

            <div className="pill-badge mb-4 mx-auto w-fit" style={{ color: mi.color, borderColor: mi.color + "50", background: mi.color + "15" }}>
              {mi.emoji} ROUND {roundNum} OF {totalRounds}
            </div>

            {/* Challenge card */}
            <div className="fun-card p-6 mb-6 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl" style={{ background: mi.color }} />
              <div className="text-4xl mb-3 animate-bounce" style={{ animationDuration: "1.5s" }}>⚽</div>
              <p className="text-xs font-bold uppercase tracking-widest mb-3 font-body" style={{ color: "hsl(215 12% 50%)" }}>
                {T.yourChallenge}
              </p>
              <div className="font-display text-2xl font-bold leading-tight text-white mb-2">
                {challenge.name}
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold font-body mt-2"
                style={{ background: mi.color + "20", color: mi.color }}>
                {T.touches(challenge.target)}
              </div>
            </div>

            <div className="fun-card p-4 mb-6 text-sm font-body text-center" style={{ color: "hsl(215 12% 55%)" }}>
              {T.dropsShort}
            </div>

            {/* Score so far */}
            {totalScore > 0 && (
              <div className="text-sm font-body mb-5" style={{ color: "hsl(215 12% 50%)" }}>
                {T.scoreSoFar(totalScore)}{/* */}<span className="font-display font-bold text-white">{totalScore} pts</span>
              </div>
            )}

            <button
              data-testid="button-solo-start-round"
              onClick={handleStartRound}
              className="btn-yellow w-full glow-yellow text-2xl py-6"
            >
              {T.startRoundBtn(roundNum)}
            </button>

            {/* Exit */}
            <div className="mt-4 text-center">
              {!exitConfirm ? (
                <button onClick={() => setExitConfirm(true)} className="text-xs font-body" style={{ color: "hsl(215 12% 38%)" }}>
                  {T.exitGame}
                </button>
              ) : (
                <div className="fun-card p-4 border border-red-500/30 text-left mt-2">
                  <p className="text-sm font-body mb-3" style={{ color: "hsl(215 12% 60%)" }}>{T.soloQuitConfirm}</p>
                  <div className="flex gap-2">
                    <button onClick={() => navigate("/")} className="flex-1 py-2 rounded-xl font-display text-sm" style={{ background: "hsl(0 72% 40%)", color: "#fff" }}>{T.quit}</button>
                    <button onClick={() => setExitConfirm(false)} className="flex-1 py-2 rounded-xl border font-display text-sm" style={{ borderColor: "hsl(220 15% 28%)", color: "hsl(215 12% 65%)" }}>{T.stay}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Race screen (timer running + touch juggling) ─────────────────────────────
  if (screen === "race" && challenge) {
    const roundNum = currentRound + 1;
    return (
      <div className="min-h-screen fun-bg flex flex-col">
        <BrandHeader />
        <div className="flex-1 flex flex-col p-4 pb-6 overflow-y-auto">
          <div className="max-w-sm mx-auto w-full flex flex-col gap-4">

            {/* Header: timer + round info */}
            <div className="text-center pt-2">
              <div className="font-display text-5xl font-bold text-white" style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatTime(elapsedMs)}
              </div>
              <div className="text-xs font-body mt-1" style={{ color: "hsl(215 12% 45%)" }}>
                {T.timerRound(roundNum, mi.label)}
              </div>
            </div>

            {/* Challenge name */}
            <div className="fun-card px-4 py-3 text-center" style={{ border: `1.5px solid ${mi.color}40` }}>
              <div className="font-display text-lg font-bold text-white leading-tight">
                {challenge.name}
              </div>
              <div className="text-xs font-body mt-1" style={{ color: mi.color }}>
                {T.touchesToComplete(challenge.target)}
              </div>
            </div>

            {/* Touch juggling game — completes automatically at the target */}
            <TouchJuggleGame
              challengeName={challenge.name}
              target={challenge.target}
              color={mi.color}
              avatar={avatar}
              onComplete={handleDone}
              enabled={screen === "race"}
            />

          </div>
        </div>
      </div>
    );
  }

  // ── Round result screen ───────────────────────────────────────────────────────
  if (screen === "result" && lastResult) {
    const isLast = currentRound >= challenges.length - 1;
    return (
      <div className="min-h-screen fun-bg flex flex-col">
        <BrandHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="max-w-sm w-full text-center animate-slide-in">

            {/* Result badge */}
            <div className="text-6xl mb-3 animate-bounce" style={{ animationDuration: "1.5s" }}>
              {lastResult.points === 5 ? "⚡" : lastResult.points === 4 ? "🔥" : lastResult.points === 3 ? "✅" : "👍"}
            </div>
            <div className="font-display text-3xl font-bold mb-1" style={{ color: lastResult.color }}>
              {lastResult.label}
            </div>
            <div className="text-sm font-body mb-6" style={{ color: "hsl(215 12% 55%)" }}>
              Finished in {formatTime(lastResult.elapsedMs)}
            </div>

            {/* Points earned */}
            <div className="fun-card p-6 mb-5" style={{ border: `1.5px solid ${lastResult.color}50` }}>
              <div className="text-xs font-bold uppercase tracking-widest mb-2 font-body" style={{ color: "hsl(215 12% 50%)" }}>
                {T.pointsEarned}
              </div>
              <div className="font-display font-bold" style={{ fontSize: "4rem", color: lastResult.color, lineHeight: 1 }}>
                +{lastResult.points}
              </div>
              <div className="mt-3 pt-3 border-t" style={{ borderColor: "hsl(220 15% 20%)" }}>
                <div className="text-xs font-body" style={{ color: "hsl(215 12% 45%)" }}>Total Score</div>
                <div className="font-display font-bold text-3xl text-white">{totalScore} pts</div>
              </div>
            </div>

            {/* Round history */}
            {results.length > 1 && (
              <div className="fun-card p-4 mb-5 text-left">
                <div className="text-xs font-bold uppercase tracking-widest mb-3 font-body" style={{ color: "hsl(215 12% 50%)" }}>
                  {T.roundHistory}
                </div>
                <div className="space-y-2">
                  {results.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="font-display font-bold w-16 text-xs" style={{ color: "hsl(215 12% 45%)" }}>
                        Round {i + 1}
                      </span>
                      <span className="flex-1 text-xs font-body text-white truncate">{r.challenge.name.split("—")[0].trim()}</span>
                      <span className="font-display font-bold" style={{ color: r.color }}>+{r.points}</span>
                      <span className="text-xs font-body" style={{ color: "hsl(215 12% 40%)" }}>{formatTime(r.elapsedMs)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              data-testid="button-solo-next"
              onClick={handleNextRound}
              className="btn-yellow w-full glow-yellow text-xl py-5"
            >
              {isLast ? T.seeScore : T.nextRoundBtn(currentRound + 2)}
            </button>

            {/* Exit */}
            {!isLast && (
              <div className="mt-4 text-center">
                {!exitConfirm ? (
                  <button onClick={() => setExitConfirm(true)} className="text-xs font-body" style={{ color: "hsl(215 12% 38%)" }}>
                    Exit game
                  </button>
                ) : (
                  <div className="fun-card p-4 border border-red-500/30 text-left mt-2">
                    <p className="text-sm font-body mb-3" style={{ color: "hsl(215 12% 60%)" }}>{T.soloQuitProgress}</p>
                    <div className="flex gap-2">
                      <button onClick={() => navigate("/")} className="flex-1 py-2 rounded-xl font-display text-sm" style={{ background: "hsl(0 72% 40%)", color: "#fff" }}>Quit</button>
                      <button onClick={() => setExitConfirm(false)} className="flex-1 py-2 rounded-xl border font-display text-sm" style={{ borderColor: "hsl(220 15% 28%)", color: "hsl(215 12% 65%)" }}>Stay</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Summary screen ────────────────────────────────────────────────────────────
  if (screen === "summary") {
    const maxPossible = challenges.length * 5;
    const pct = Math.round((totalScore / maxPossible) * 100);
    const grade =
      pct >= 90 ? { label: "LEGENDARY", emoji: "👑", color: "#eab308" } :
      pct >= 75 ? { label: "BALLER", emoji: "🔥", color: "#f97316" } :
      pct >= 60 ? { label: "SOLID", emoji: "⚡", color: "#22c55e" } :
      pct >= 40 ? { label: "TRAINING", emoji: "💪", color: "#3b82f6" } :
               { label: "KEEP GOING", emoji: "⚽", color: "#a855f7" };

    return (
      <div className="min-h-screen fun-bg flex flex-col">
        <BrandHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="max-w-sm w-full text-center animate-slide-in">

            <div className="text-7xl mb-3 animate-bounce" style={{ animationDuration: "2s" }}>{grade.emoji}</div>
            <div className="font-display text-4xl font-bold mb-1" style={{ color: grade.color }}>
              {grade.label}
            </div>
            <div className="text-sm font-body mb-6" style={{ color: "hsl(215 12% 55%)" }}>
              {avatar} {name} · {mi.emoji} {mi.label}
            </div>

            {/* Score card */}
            <div className="fun-card p-6 mb-5 relative overflow-hidden" style={{ border: `1.5px solid ${grade.color}50` }}>
              <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl" style={{ background: grade.color }} />
              <div className="font-display font-bold mb-1" style={{ fontSize: "4.5rem", color: grade.color, lineHeight: 1 }}>
                {totalScore}
              </div>
              <div className="font-display text-xl text-white mb-1">POINTS</div>
              <div className="text-sm font-body" style={{ color: "hsl(215 12% 50%)" }}>
                {T.outOf(totalScore, maxPossible, pct)}
              </div>

              {/* Progress bar */}
              <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ background: "hsl(220 16% 20%)" }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: grade.color }} />
              </div>
            </div>

            {/* Round breakdown */}
            <div className="fun-card p-4 mb-5 text-left">
              <div className="text-xs font-bold uppercase tracking-widest mb-3 font-body" style={{ color: "hsl(215 12% 50%)" }}>
                {T.roundBreakdown}
              </div>
              <div className="space-y-2">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="font-display font-bold w-16 text-xs" style={{ color: "hsl(215 12% 45%)" }}>
                      Round {i + 1}
                    </span>
                    <span className="flex-1 text-xs font-body text-white truncate">{r.challenge.name.split("—")[0].trim()}</span>
                    <span className="font-display font-bold" style={{ color: r.color }}>+{r.points}</span>
                    <span className="text-xs font-body" style={{ color: "hsl(215 12% 40%)" }}>{formatTime(r.elapsedMs)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit to leaderboard */}
            {!submitted ? (
              <button
                data-testid="button-solo-submit-leaderboard"
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                className="w-full py-3 border font-display font-bold rounded-xl transition-colors disabled:opacity-50 mb-3 text-sm"
                style={{ borderColor: `${grade.color}50`, color: grade.color, background: `${grade.color}10` }}
              >
                {submitMutation.isPending ? T.submitting : T.submitLeaderboard}
              </button>
            ) : (
              <div className="w-full py-3 border border-green-500/40 text-green-400 font-display font-bold rounded-xl text-sm text-center mb-3 bg-green-500/5">
                {T.addedToLeaderboard}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                data-testid="button-solo-retry"
                onClick={handleRestart}
                className="flex-1 btn-yellow glow-yellow py-4 text-base"
              >
                {T.playAgain}
              </button>
              <button
                onClick={() => navigate("/")}
                className="flex-1 py-4 rounded-2xl font-display font-bold text-base transition-all"
                style={{ background: "hsl(220 16% 16%)", border: "1.5px solid hsl(220 15% 26%)", color: "hsl(215 12% 65%)" }}
              >
                {T.home}
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return null;
}
