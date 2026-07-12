import BrandHeader from "@/components/game/BrandHeader";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { MODE_INFO } from "../../../shared/schema";
import { useLang } from "../LanguageContext";
import type { GameMode } from "../../../shared/schema";

const MODE_STYLES: Record<GameMode, { border: string; glow: string; bg: string }> = {
  discovery:  { border: "#a855f7", glow: "0 0 20px #a855f750", bg: "rgba(168,85,247,0.1)" },
  challenger: { border: "#22c55e", glow: "0 0 20px #22c55e50", bg: "rgba(34,197,94,0.1)" },
  baller:     { border: "#3b82f6", glow: "0 0 20px #3b82f650", bg: "rgba(59,130,246,0.1)" },
  captain:    { border: "#f59e0b", glow: "0 0 20px #f59e0b50", bg: "rgba(245,158,11,0.1)" },
};

function RoomShare({ roomCode }: { roomCode: string }) {
  const [copied, setCopied] = useState(false);

  const joinUrl = `${window.location.origin}${window.location.pathname.replace(/#.*$/, "")}#/join?code=${roomCode}`;

  const shareText = `Hey! I'm starting a Captains Wheel Game ⚽🔥\n\nJoin here 👉 ${joinUrl}\n\nOr open the game and enter room code: ${roomCode}\n\nEvery round gets wilder. First one there is The Captain! 👑`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({ title: "Captains Wheel Game", text: shareText, url: joinUrl });
    } else {
      handleCopy();
    }
  };

  const smsLink = `sms:?body=${encodeURIComponent(shareText)}`;
  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="fun-card p-5 mb-5 text-center">
      <p className="text-xs font-bold uppercase tracking-widest mb-2 font-body" style={{ color: "hsl(215 12% 45%)" }}>
        {T.shareWithFriends}
      </p>
      <div className="font-display inline-block mb-1 tracking-widest" style={{ fontSize: "clamp(2rem, 10vw, 2.8rem)", color: "hsl(45 95% 55%)", textShadow: "0 0 20px hsl(45 95% 55% / 0.5)" }}>
        {roomCode}
      </div>
      <p className="text-xs mb-4 font-body" style={{ color: "hsl(215 12% 45%)" }}>
        {T.everyoneNeedsToJoin}
      </p>

      {/* Share buttons */}
      <div className="flex gap-2 justify-center flex-wrap">
        <button
          onClick={handleNativeShare}
          className="flex items-center gap-2 px-4 py-2.5 font-display text-sm rounded-xl transition-all hover:scale-[1.04] active:scale-[0.97]"
          style={{ background: "hsl(220 88% 57%)", color: "#fff", boxShadow: "0 4px 14px hsl(220 88% 57% / 0.4)" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          {T.share}
        </button>

        <a
          href={smsLink}
          className="flex items-center gap-1.5 px-4 py-2.5 font-display text-sm rounded-xl transition-all hover:scale-[1.04] active:scale-[0.97]"
          style={{ background: "hsl(220 16% 20%)", color: "#fff", border: "1.5px solid hsl(220 15% 28%)" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {T.message}
        </a>

        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-2.5 font-display text-sm rounded-xl transition-all hover:scale-[1.04] active:scale-[0.97]"
          style={{ background: "hsl(220 16% 20%)", color: "#fff", border: "1.5px solid hsl(220 15% 28%)" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="#25D366">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          {T.whatsapp}
        </a>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-2.5 font-display text-sm rounded-xl transition-all hover:scale-[1.04]"
          style={{
            background: "hsl(220 16% 20%)",
            color: copied ? "#4ade80" : "#fff",
            border: `1.5px solid ${copied ? "#4ade8060" : "hsl(220 15% 28%)"}`,
          }}
        >
          {copied ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {copied ? T.copied : T.copyLink}
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function Lobby() {
  const { roomId, playerId } = useParams();
  const [, navigate] = useLocation();

  const { T } = useLang();
  const { data: state, isLoading } = useQuery({
    queryKey: ["/api/rooms", roomId, "state"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/rooms/${roomId}/state`);
      return res.json();
    },
    refetchInterval: 2000,
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/rooms/${roomId}/start`);
      return res.json();
    },
    onSuccess: () => {
      navigate(`/host/${roomId}/${playerId}`);
    },
  });

  useEffect(() => {
    if (state?.room?.status === "active") {
      navigate(`/player/${roomId}/${playerId}`);
    }
  }, [state?.room?.status]);

  const me = state?.players?.find((p: any) => p.id === Number(playerId));
  const isHost = me?.isHost === 1;

  if (isLoading || !state) {
    return (
      <div className="min-h-screen fun-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const m = state.room.mode as GameMode;
  const mi = MODE_INFO[m];
  const ms = MODE_STYLES[m];
  const canStart = state.players.length >= 1;

  return (
    <div className="min-h-screen fun-bg flex flex-col">
      <BrandHeader />
      <div className="flex-1 flex flex-col items-center justify-center p-5">
        <div className="w-full max-w-sm">

          {/* Mode badge */}
          <div className="text-center mb-5">
            <div
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 font-display text-sm"
              style={{ color: ms.border, border: `1.5px solid ${ms.border}60`, background: ms.bg, boxShadow: ms.glow }}
            >
              {mi.emoji} {mi.label} · {mi.rounds} Round{mi.rounds !== 1 ? "s" : ""}
            </div>
          </div>

          <RoomShare roomCode={state.room.roomCode} />

          {/* Players list */}
          <div className="fun-card p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg text-white">{T.playersInRoom}</h3>
              <div className="font-display text-sm rounded-full px-3 py-1" style={{ background: "hsl(220 16% 20%)", color: "hsl(215 12% 55%)" }}>
                {state.players.length} / 6
              </div>
            </div>
            <div className="space-y-2.5">
              {state.players.map((p: any, i: number) => (
                <div
                  key={p.id}
                  data-testid={`player-${p.id}`}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 animate-slide-in"
                  style={{ background: "hsl(220 16% 18%)", animationDelay: `${i * 0.06}s` }}
                >
                  <span className="text-2xl">{p.avatar}</span>
                  <span className="font-display text-lg text-white flex-1">{p.name}</span>
                  {p.isHost === 1 && (
                    <span className="font-display text-xs rounded-full px-2.5 py-1" style={{ background: "hsl(220 88% 57% / 0.15)", color: "hsl(220 88% 70%)", border: "1px solid hsl(220 88% 57% / 0.3)" }}>
                      {T.host}
                    </span>
                  )}
                  <span className="text-green-400 text-sm font-bold">✓</span>
                </div>
              ))}
            </div>
            {state.players.length < 2 && (
              <div className="mt-4 text-center">
                <div className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-body" style={{ background: "hsl(220 16% 18%)", color: "hsl(215 12% 50%)" }}>
                  <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  {T.waitingForPlayers}
                </div>
              </div>
            )}
          </div>

          {/* Action */}
          {isHost ? (
            <div>
              <button
                data-testid="button-start-game"
                onClick={() => startMutation.mutate()}
                disabled={!canStart || startMutation.isPending}
                className="btn-yellow w-full glow-yellow disabled:opacity-40 disabled:cursor-not-allowed text-xl py-5"
                style={{ opacity: canStart ? 1 : 0.4 }}
              >
                {startMutation.isPending ? T.starting : T.startGame}
              </button>
              {!canStart && (
                <p className="text-center text-xs mt-3 font-body" style={{ color: "hsl(215 12% 40%)" }}>
                  {T.needMorePlayers}
                </p>
              )}
            </div>
          ) : (
            <div className="fun-card p-5 text-center">
              <div className="text-3xl mb-2 animate-float inline-block">⏳</div>
              <p className="font-display text-lg text-white">{T.getReady}</p>
              <p className="text-sm mt-1 font-body" style={{ color: "hsl(215 12% 50%)" }}>
                {T.waitingForHost}
              </p>
              <div className="flex justify-center gap-1 mt-4">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: "hsl(220 88% 57%)",
                      animation: `scoreFlash 1.2s ease-in-out ${i * 0.3}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
