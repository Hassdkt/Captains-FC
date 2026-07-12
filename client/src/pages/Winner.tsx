import BrandHeader from "@/components/game/BrandHeader";
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MODE_INFO } from "../../../shared/schema";
import { useLang } from "../LanguageContext";
import type { Player, GameMode } from "../../../shared/schema";

export default function Winner() {
  const { roomId } = useParams();
  const [, navigate] = useLocation();
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const { T } = useLang();
  const [revengeCopied, setRevengeCopied] = useState(false);

  const { data: state } = useQuery({
    queryKey: ["/api/rooms", roomId, "state"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/rooms/${roomId}/state`);
      return res.json();
    },
  });

  const players: Player[] = state?.players || [];
  const sorted = [...players].sort((a, b) => b.totalScore - a.totalScore);
  const captain = sorted[0];
  const room = state?.room;
  const mode = (room?.mode || "baller") as GameMode;
  const modeInfo = MODE_INFO[mode];

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/rooms/${roomId}/leaderboard`);
      return res.json();
    },
    onSuccess: () => setSubmitted(true),
  });

  if (!captain) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Build shareable result text
  const resultText = [
    `⚽ Captains Wheel Game — ${modeInfo.emoji} ${modeInfo.label}`,
    `👑 THE CAPTAIN: ${captain.avatar} ${captain.name} — ${captain.totalScore} pts`,
    "",
    "{T.finalStandings}:",
    ...sorted.map((p, i) => `${i === 0 ? "👑" : `${i + 1}.`} ${p.avatar} ${p.name} — ${p.totalScore} pts`),
    "",
    "Every round gets wilder. 🔥",
    "Play at captainsofsoccer.com",
  ].join("\n");

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: "Captains Wheel Game Result", text: resultText });
    } else {
      navigator.clipboard.writeText(resultText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <BrandHeader />
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-sm w-full text-center animate-slide-in">

          {/* Mode badge */}
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest border mb-6"
            style={{ color: modeInfo.color, borderColor: modeInfo.color + "60", backgroundColor: modeInfo.color + "18" }}>
            {modeInfo.emoji} {modeInfo.label}
          </div>

          {/* Crown */}
          <div className="text-8xl mb-3 animate-bounce" style={{ animationDuration: "2s" }}>👑</div>
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
            {T.afterRounds(room?.maxRounds || 0)}
          </div>

          {/* Winner card */}
          <div className="bg-primary/5 border-2 border-primary rounded-2xl p-6 mb-6 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div className="text-6xl mb-3">{captain.avatar}</div>
            <h2 className="font-display text-5xl font-bold text-primary mb-1">{captain.name.toUpperCase()}</h2>
            <div className="font-display text-3xl font-bold text-foreground">{captain.totalScore} pts</div>
            <div className="text-muted-foreground text-sm mt-2 uppercase tracking-widest font-bold">{T.isTheCaptain}</div>
          </div>

          {/* Final standings */}
          <div className="bg-secondary border border-border rounded-2xl p-4 mb-5">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Final Standings</div>
            <div className="space-y-2">
              {sorted.map((p, i) => (
                <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl ${i === 0 ? "bg-primary/5 border border-primary/30" : "bg-muted/30"}`}>
                  <span className={`font-display font-bold text-lg w-6 ${i === 0 ? "text-primary" : "text-muted-foreground"}`}>{i + 1}</span>
                  <span className="text-2xl">{p.avatar}</span>
                  <span className="flex-1 font-semibold text-left">{p.name}</span>
                  <span className={`font-display font-bold text-xl ${i === 0 ? "text-primary" : "text-muted-foreground"}`}>{p.totalScore}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Result card preview */}
          <div className="bg-card border border-border rounded-2xl p-4 mb-5 text-left">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">{T.resultCard}</div>
            <div className="bg-background border border-border rounded-xl p-3 font-mono text-xs text-muted-foreground space-y-0.5">
              <div className="text-primary font-bold text-sm mb-2">⚽ Captains Wheel · {modeInfo.emoji} {modeInfo.label}</div>
              {sorted.map((p, i) => (
                <div key={p.id}>{i === 0 ? "👑" : `${i + 1}.`} {p.avatar} {p.name} — {p.totalScore} pts</div>
              ))}
            </div>
          </div>

          {/* Share buttons */}
          <div className="flex gap-2 mb-5">
            <button onClick={handleShare} className="flex-1 btn-captains glow-blue py-3 text-sm">
              {T.shareResult}
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-3 bg-secondary border border-border font-display text-sm rounded-xl transition-all hover:border-primary/50"
              style={{ color: copied ? "#22c55e" : undefined }}
            >
              {copied ? T.copiedBtn : T.copyBtn}
            </button>
          </div>

          {/* Submit to leaderboard */}
          {!submitted ? (
            <button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="w-full py-3 border border-primary/40 text-primary font-display font-bold rounded-xl hover:bg-primary/10 transition-colors disabled:opacity-50 mb-4 text-sm"
            >
              {submitMutation.isPending ? T.submitting : "{T.submitToLeaderboard}"}
            </button>
          ) : (
            <div className="w-full py-3 border border-green-500/40 text-green-400 font-display font-bold rounded-xl text-sm text-center mb-4 bg-green-500/5">
              {T.addedToBoard}
            </div>
          )}

          {/* Revenge block */}
          <div className="bg-red-500/5 border border-red-500/30 rounded-2xl p-5 mb-4 text-center">
            <div className="text-3xl mb-2">🔥</div>
            <h3 className="font-display text-2xl font-bold text-red-400 mb-1">{T.wantRevenge}</h3>
            <p className="text-sm text-muted-foreground font-body mb-4">
              {T.revengeText(captain.name)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const revengeText = `🔥 REVENGE TIME!\n\n${captain.avatar} ${captain.name} just won Captains Wheel with ${captain.totalScore} pts.\n\nI'm calling a rematch — you in?\n\nEvery round gets wilder. ⚽👑\nPlay now → captainsofsoccer.com`;
                  if (navigator.share) {
                    navigator.share({ title: "Captains Wheel Revenge", text: revengeText });
                  } else {
                    navigator.clipboard.writeText(revengeText);
                    setRevengeCopied(true);
                    setTimeout(() => setRevengeCopied(false), 2500);
                  }
                }}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-display font-bold rounded-xl transition-colors text-sm"
              >
                {T.challengeThem}
              </button>
              <button
                onClick={() => navigate("/")}
                className="flex-1 py-3 border border-red-500/40 text-red-400 font-display font-bold rounded-xl hover:bg-red-500/10 transition-colors text-sm"
              >
                {T.newGame}
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => navigate("/leaderboard")} className="flex-1 btn-outline py-3 text-sm">
              {T.leaderboardBtn}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
