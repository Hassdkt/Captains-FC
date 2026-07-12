import BrandHeader from "@/components/game/BrandHeader";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AVATARS } from "../../../shared/schema";
import { fetchProfile, saveProfile, getCachedProfile } from "@/hooks/usePlayerProfile";
import { useLang } from "../LanguageContext";

export default function JoinRoom() {
  const [, navigate] = useLocation();

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#\/join\??/, ""));
  const codeFromUrl = hashParams.get("code") || "";

  const cached = getCachedProfile();
  const { T } = useLang();
  const [code, setCode] = useState(codeFromUrl);
  const [name, setName] = useState(cached?.name || "");
  const [avatar, setAvatar] = useState(cached?.avatar || "🔴");
  const [editing, setEditing] = useState(!cached);
  const [step, setStep] = useState<"code" | "name">(codeFromUrl ? "name" : "code");
  const [roomId, setRoomId] = useState<number | null>(null);

  useEffect(() => {
    if (cached) return;
    fetchProfile().then(p => {
      if (p) { setName(p.name); setAvatar(p.avatar); setEditing(false); }
    });
  }, []);

  const lookupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", `/api/rooms/code/${code.toUpperCase()}`);
      if (!res.ok) throw new Error("Room not found");
      return res.json();
    },
    onSuccess: (room) => {
      setRoomId(room.id);
      setStep("name");
    },
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      let id = roomId;
      if (!id) {
        const res = await apiRequest("GET", `/api/rooms/code/${code.toUpperCase()}`);
        if (!res.ok) throw new Error("Room not found");
        const room = await res.json();
        id = room.id;
        setRoomId(id);
      }
      const res = await apiRequest("POST", `/api/rooms/${id}/join`, { name, avatar, isHost: false });
      return { player: await res.json(), id };
    },
    onSuccess: ({ player, id }) => {
      saveProfile({ name, avatar });
      navigate(`/lobby/${id}/${player.id}`);
    },
  });

  return (
    <div className="min-h-screen fun-bg flex flex-col">
      <BrandHeader />
      <div className="flex-1 flex flex-col items-center justify-center p-5">
        <div className="w-full max-w-sm">
          <button
            onClick={() => step === "name" ? setStep("code") : navigate("/")}
            className="text-sm mb-5 flex items-center gap-1 transition-colors font-body"
            style={{ color: "hsl(215 12% 45%)" }}
          >
            {T.back}
          </button>

          {step === "code" ? (
            <>
              <div className="text-center mb-8">
                <div className="text-5xl mb-3 animate-bounce-in">🎯</div>
                <h2 className="font-display text-4xl text-white">{T.joinAGame}</h2>
                <p className="text-sm mt-2 font-body" style={{ color: "hsl(215 12% 52%)" }}>
                  {T.joinSub}
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest mb-3 block font-body" style={{ color: "hsl(215 12% 45%)" }}>
                    {T.roomCode}
                  </label>
                  <input
                    data-testid="input-room-code"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="CAP-XXXX"
                    maxLength={8}
                    className="w-full rounded-2xl px-4 py-5 text-white placeholder:text-muted-foreground focus:outline-none text-3xl font-display font-bold tracking-widest text-center uppercase"
                    style={{
                      background: "hsl(220 18% 14%)",
                      border: "2px solid hsl(220 15% 26%)",
                      letterSpacing: "0.18em",
                    }}
                    onFocus={e => { e.target.style.borderColor = "hsl(220 88% 57%)"; }}
                    onBlur={e => { e.target.style.borderColor = "hsl(220 15% 26%)"; }}
                  />
                </div>
                {lookupMutation.isError && (
                  <div className="rounded-xl px-4 py-3 text-sm text-center font-body" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
                    {T.roomNotFound}
                  </div>
                )}
                <button
                  data-testid="button-find-room"
                  onClick={() => lookupMutation.mutate()}
                  disabled={code.length < 4 || lookupMutation.isPending}
                  className="btn-captains w-full glow-blue disabled:opacity-50 text-xl py-5"
                >
                  {lookupMutation.isPending ? T.looking : T.findRoom}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-7">
                {/* Room code pill */}
                <div className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 mb-4 font-display text-lg tracking-widest" style={{ background: "hsl(220 88% 57% / 0.15)", color: "hsl(220 88% 70%)", border: "1.5px solid hsl(220 88% 57% / 0.4)" }}>
                  {code}
                </div>
                <h2 className="font-display text-4xl text-white">{T.whoAreYou}</h2>
                <p className="text-sm mt-1 font-body" style={{ color: "hsl(215 12% 52%)" }}>{T.pickNameColor}</p>
              </div>

              <div className="space-y-5">
                {/* Profile — pre-filled or editable */}
                {!editing ? (
                  <div className="fun-card flex items-center gap-4 px-4 py-4">
                    <div className="text-4xl">{avatar}</div>
                    <div className="flex-1">
                      <div className="font-display text-xl text-white">{name}</div>
                      <div className="text-xs font-body" style={{ color: "hsl(215 12% 50%)" }}>{T.thatsYou}</div>
                    </div>
                    <button
                      onClick={() => setEditing(true)}
                      className="text-xs font-bold font-body px-3 py-1.5 rounded-lg transition-colors"
                      style={{ color: "hsl(220 88% 65%)", background: "hsl(220 88% 57% / 0.12)" }}
                    >{T.change}
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest mb-2 block font-body" style={{ color: "hsl(215 12% 45%)" }}>{T.yourName}
                      </label>
                      <input
                        data-testid="input-player-name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder={T.enterYourName}
                        autoFocus
                        className="w-full rounded-2xl px-4 py-4 text-white placeholder:text-muted-foreground focus:outline-none text-xl font-display"
                        style={{
                          background: "hsl(220 18% 14%)",
                          border: "2px solid hsl(220 15% 26%)",
                        }}
                        onFocus={e => { e.target.style.borderColor = "hsl(220 88% 57%)"; }}
                        onBlur={e => { e.target.style.borderColor = "hsl(220 15% 26%)"; }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest mb-3 block font-body" style={{ color: "hsl(215 12% 45%)" }}>{T.pickYourColor}
                      </label>
                      <div className="flex gap-3 justify-between">
                        {AVATARS.map(av => (
                          <button
                            key={av}
                            onClick={() => setAvatar(av)}
                            className="flex-1 h-14 rounded-2xl text-3xl flex items-center justify-center border-2 transition-all"
                            style={{
                              borderColor: avatar === av ? "hsl(220 88% 57%)" : "hsl(220 15% 22%)",
                              background: avatar === av ? "hsl(220 88% 57% / 0.15)" : "hsl(220 18% 14%)",
                              transform: avatar === av ? "scale(1.12)" : "scale(1)",
                            }}
                          >
                            {av}
                          </button>
                        ))}
                      </div>
                    </div>
                    {cached && (
                      <button
                        onClick={() => { setName(cached.name); setAvatar(cached.avatar); setEditing(false); }}
                        className="text-xs font-body transition-colors"
                        style={{ color: "hsl(215 12% 40%)" }}
                      >
                        {T.useSavedName}
                      </button>
                    )}
                  </>
                )}

                <button
                  data-testid="button-join-room"
                  onClick={() => joinMutation.mutate()}
                  disabled={!name.trim() || joinMutation.isPending}
                  className="btn-captains w-full glow-blue disabled:opacity-50 text-xl py-5"
                >
                  {joinMutation.isPending ? T.joining : T.letsGo}
                </button>

                {joinMutation.isError && (
                  <div className="rounded-xl px-4 py-3 text-sm text-center font-body" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
                    {T.joinError}
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
