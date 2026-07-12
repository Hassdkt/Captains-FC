import BrandHeader from "@/components/game/BrandHeader";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AVATARS, MODE_INFO } from "../../../shared/schema";
import type { GameMode } from "../../../shared/schema";
import { fetchProfile, saveProfile, getCachedProfile } from "@/hooks/usePlayerProfile";

const MODES: GameMode[] = ["discovery", "challenger", "baller", "captain"];

export default function CreateRoom() {
  const [, navigate] = useLocation();
  const cached = getCachedProfile();
  const [name, setName] = useState(cached?.name || "");
  const [avatar, setAvatar] = useState(cached?.avatar || "🔵");
  const [editing, setEditing] = useState(!cached);
  const [mode, setMode] = useState<GameMode>("challenger");

  useEffect(() => {
    if (cached) return;
    fetchProfile().then(p => {
      if (p) { setName(p.name); setAvatar(p.avatar); setEditing(false); }
    });
  }, []);

  const createMutation = useMutation({
    mutationFn: async () => {
      const room = await apiRequest("POST", "/api/rooms", { mode });
      const roomData = await room.json();
      const playerRes = await apiRequest("POST", `/api/rooms/${roomData.id}/join`, { name, avatar, isHost: true });
      const player = await playerRes.json();
      return { room: roomData, player };
    },
    onSuccess: ({ room, player }) => {
      saveProfile({ name, avatar });
      navigate(`/lobby/${room.id}/${player.id}`);
    },
  });

  return (
    <div className="min-h-screen fun-bg flex flex-col">
      <BrandHeader />
      <div className="flex-1 flex flex-col items-center justify-center p-5">
        <div className="w-full max-w-sm">
          <button onClick={() => navigate("/")} className="text-sm mb-5 flex items-center gap-1 transition-colors font-body" style={{ color: "hsl(215 12% 45%)" }}>
            {T.back}
          </button>

          <div className="text-center mb-7">
            <div className="text-4xl mb-2">🎮</div>
            <h2 className="font-display text-4xl text-white">{T.createGame}</h2>
            <p className="text-sm mt-1 font-body" style={{ color: "hsl(215 12% 52%)" }}>{T.createSub}</p>
          </div>

          <div className="space-y-5">

            {/* Mode picker */}
            <div>
              <label className="text-xs font-bold uppercase tracking-widest mb-3 block font-body" style={{ color: "hsl(215 12% 45%)" }}>{T.gameMode}
              </label>
              <div className="flex flex-col gap-2.5">
                {MODES.map(m => {
                  const mi = MODE_INFO[m];
                  const active = mode === m;
                  return (
                    <button
                      key={m}
                      data-testid={`mode-${m}`}
                      onClick={() => setMode(m)}
                      className="w-full rounded-2xl border-2 p-4 text-left transition-all"
                      style={{
                        borderColor: active ? mi.color : "hsl(220 15% 22%)",
                        background: active ? mi.color + "14" : "hsl(220 18% 14%)",
                        boxShadow: active ? `0 0 20px ${mi.color}40` : "none",
                        transform: active ? "scale(1.01)" : "scale(1)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{mi.emoji}</span>
                          <div>
                            <div className="font-display text-xl leading-tight" style={{ color: active ? mi.color : "#fff" }}>
                              {mi.label.toUpperCase()}
                            </div>
                            <div className="text-xs font-body mt-0.5" style={{ color: "hsl(215 12% 50%)" }}>{mi.tagline} · {mi.duration}</div>
                          </div>
                        </div>
                        {active ? (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: mi.color, color: "#000" }}>✓</div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2" style={{ borderColor: "hsl(220 15% 28%)" }} />
                        )}
                      </div>
                      {/* Round count pills */}
                      <div className="flex gap-2 mt-2.5 flex-wrap">
                        <span className="pill-badge" style={{ background: "rgba(255,255,255,0.06)", color: "hsl(215 12% 60%)" }}>
                          🔄 {mi.rounds} round{mi.rounds > 1 ? "s" : ""}
                        </span>
                        <span className="pill-badge" style={{ background: "rgba(255,255,255,0.06)", color: "hsl(215 12% 60%)" }}>
                          ⏱ {mi.duration}
                        </span>
                      </div>
                      {active && (
                        <div className="mt-2 text-xs font-body" style={{ color: "hsl(215 12% 55%)" }}>{mi.description}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Profile */}
            <div>
              <label className="text-xs font-bold uppercase tracking-widest mb-3 block font-body" style={{ color: "hsl(215 12% 45%)" }}>
                {T.yourPlayerCard}
              </label>
              {!editing ? (
                <div className="fun-card flex items-center gap-4 px-4 py-4">
                  <div className="text-4xl">{avatar}</div>
                  <div className="flex-1">
                    <div className="font-display text-xl text-white">{name}</div>
                    <div className="text-xs font-body" style={{ color: "hsl(215 12% 50%)" }}>{T.thatsYou}</div>
                  </div>
                  <button onClick={() => setEditing(true)} className="text-xs font-bold font-body px-3 py-1.5 rounded-lg" style={{ color: "hsl(220 88% 65%)", background: "hsl(220 88% 57% / 0.12)" }}>{T.change}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest mb-2 block font-body" style={{ color: "hsl(215 12% 45%)" }}>{T.yourName}</label>
                    <input
                      data-testid="input-host-name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder={T.enterYourName}
                      autoFocus
                      className="w-full rounded-2xl px-4 py-4 text-white placeholder:text-muted-foreground focus:outline-none text-xl font-display"
                      style={{ background: "hsl(220 18% 14%)", border: "2px solid hsl(220 15% 26%)" }}
                      onFocus={e => { e.target.style.borderColor = "hsl(220 88% 57%)"; }}
                      onBlur={e => { e.target.style.borderColor = "hsl(220 15% 26%)"; }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest mb-3 block font-body" style={{ color: "hsl(215 12% 45%)" }}>{T.pickYourColor}</label>
                    <div className="flex gap-3 justify-between">
                      {AVATARS.map(av => (
                        <button key={av} data-testid={`avatar-${av}`} onClick={() => setAvatar(av)}
                          className="flex-1 h-14 rounded-2xl text-3xl flex items-center justify-center border-2 transition-all"
                          style={{
                            borderColor: avatar === av ? "hsl(220 88% 57%)" : "hsl(220 15% 22%)",
                            background: avatar === av ? "hsl(220 88% 57% / 0.15)" : "hsl(220 18% 14%)",
                            transform: avatar === av ? "scale(1.12)" : "scale(1)",
                          }}>
                          {av}
                        </button>
                      ))}
                    </div>
                  </div>
                  {cached && (
                    <button onClick={() => setEditing(false)} className="text-xs font-body" style={{ color: "hsl(215 12% 40%)" }}>{T.useSavedName}</button>
                  )}
                </div>
              )}
            </div>

            <button
              data-testid="button-create-room"
              onClick={() => createMutation.mutate()}
              disabled={!name.trim() || createMutation.isPending}
              className="btn-yellow w-full glow-yellow disabled:opacity-50 disabled:cursor-not-allowed mt-1 text-xl py-5"
            >
              {createMutation.isPending ? T.creating : T.createRoom}
            </button>

            {createMutation.isError && (
              <p className="text-red-400 text-sm text-center font-body">{T.somethingWentWrong}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
