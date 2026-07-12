import BrandHeader from "@/components/game/BrandHeader";
import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MODE_INFO } from "../../../shared/schema";
import { useLang } from "../LanguageContext";
import type { GameMode, LeaderboardEntry } from "../../../shared/schema";

const TABS: { mode: string; label: string; emoji: string; solo?: boolean }[] = [
  { mode: "all", label: "All", emoji: "🏆" },
  { mode: "discovery", label: "Discovery", emoji: "👀" },
  { mode: "challenger", label: "Challenger", emoji: "⚡" },
  { mode: "baller", label: "Baller", emoji: "🔥" },
  { mode: "captain", label: "Captain", emoji: "👑" },
  { mode: "solo_discovery", label: "Solo: Disc.", emoji: "🧘", solo: true },
  { mode: "solo_challenger", label: "Solo: Chall.", emoji: "🧘", solo: true },
  { mode: "solo_baller", label: "Solo: Baller", emoji: "🧘", solo: true },
  { mode: "solo_captain", label: "Solo: Capt.", emoji: "🧘", solo: true },
];

export default function Leaderboard() {
  const [, navigate] = useLocation();
  const { T } = useLang();
  const [tab, setTab] = useState<string>("all");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["/api/leaderboard", tab],
    queryFn: async () => {
      const url = tab === "all" ? "/api/leaderboard" : `/api/leaderboard?mode=${tab}`;
      const res = await apiRequest("GET", url);
      return res.json() as Promise<LeaderboardEntry[]>;
    },
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <BrandHeader />
      <div className="flex-1 p-4">
        <div className="max-w-sm mx-auto w-full">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-3xl font-bold">{T.leaderboardTitle}</h2>
              <p className="text-muted-foreground text-xs font-body mt-0.5">{T.leaderboardSub}</p>
            </div>
            <button onClick={() => navigate("/")} className="text-muted-foreground text-sm hover:text-foreground transition-colors font-body">
              {T.homeLink}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
            {TABS.filter(t => !t.solo).map(t => {
              const active = tab === t.mode;
              const mi = t.mode !== "all" && !t.solo ? MODE_INFO[t.mode as GameMode] : null;
              return (
                <button
                  key={t.mode}
                  onClick={() => setTab(t.mode)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-bold whitespace-nowrap transition-all ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:border-primary/40"}`}
                  style={active && mi ? { borderColor: mi.color, backgroundColor: mi.color + "18", color: mi.color } : {}}
                >
                  {t.emoji} {t.label}
                </button>
              );
            })}
          </div>
          {/* Solo tabs */}
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            {TABS.filter(t => t.solo).map(t => {
              const active = tab === t.mode;
              return (
                <button
                  key={t.mode}
                  onClick={() => setTab(t.mode)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold whitespace-nowrap transition-all ${active ? "border-purple-500 bg-purple-500/10 text-purple-400" : "border-border bg-secondary text-muted-foreground hover:border-purple-500/40"}`}
                >
                  {t.emoji} {t.label}
                </button>
              );
            })}
          </div>

          {/* Entries */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🏆</div>
              <p className="text-muted-foreground font-body">{T.noGamesYet}</p>
              <p className="text-muted-foreground/60 text-sm font-body mt-1">{T.playFirst}</p>
              <button onClick={() => navigate("/")} className="btn-captains mt-6 px-6 py-3">
                {T.playNow}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry, i) => {
                const entryModeRaw = entry.mode || "baller";
                const isSolo = entryModeRaw.startsWith("solo_");
                const baseMode = (isSolo ? entryModeRaw.replace("solo_", "") : entryModeRaw) as GameMode;
                const mi = MODE_INFO[baseMode] || MODE_INFO["baller"];
                const allScores: { name: string; avatar: string; score: number }[] = JSON.parse(entry.allScores || "[]");
                const date = new Date(entry.createdAt * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });

                return (
                  <div key={entry.id} className={`bg-secondary border rounded-2xl p-4 ${i === 0 && tab !== "all" ? "border-primary/50" : "border-border"}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-2xl text-muted-foreground w-7">{i + 1}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{entry.winnerAvatar}</span>
                            <span className="font-display font-bold text-xl">{entry.winnerName}</span>
                            {i === 0 && tab !== "all" && <span className="text-primary text-xs font-bold">👑 TOP</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs rounded-full px-2 py-0.5 font-bold border"
                              style={{ color: mi.color, borderColor: mi.color + "50", backgroundColor: mi.color + "15" }}>
                              {isSolo ? "🧘" : mi.emoji} {isSolo ? "Solo · " : ""}{mi.label}
                            </span>
                            <span className="text-xs text-muted-foreground font-body">{date}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-display font-bold text-2xl text-primary">{entry.winnerScore}</div>
                        <div className="text-xs text-muted-foreground font-body">pts</div>
                      </div>
                    </div>

                    {/* Other players */}
                    {allScores.length > 1 && (
                      <div className="pt-3 border-t border-border space-y-1">
                        {allScores.slice(1).map((p, pi) => (
                          <div key={pi} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="w-4">{pi + 2}.</span>
                            <span>{p.avatar}</span>
                            <span className="flex-1 font-body">{p.name}</span>
                            <span className="font-display font-bold">{p.score}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
