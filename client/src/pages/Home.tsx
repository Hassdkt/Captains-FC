import { useLocation } from "wouter";
import { useLang } from "../LanguageContext";
import { LANG_LABELS } from "../i18n";
import type { Lang } from "../i18n";
import ChallengeWheel from "@/components/game/ChallengeWheel";

export default function Home() {
  const [, navigate] = useLocation();
  const { T, lang, setLang } = useLang();

  const HOW_TO_PLAY = [
    { icon: "⚽", color: "#22d3ee", bg: "rgba(34,211,238,0.12)", title: T.step1Title, text: T.step1Text },
    { icon: "🏃", color: "#22c55e", bg: "rgba(34,197,94,0.12)",  title: T.step2Title, text: T.step2Text },
    { icon: "🏆", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", title: T.step3Title, text: T.step3Text },
    { icon: "👑", color: "#eab308", bg: "rgba(234,179,8,0.12)",  title: T.step4Title, text: T.step4Text },
  ];

  return (
    <div className="min-h-screen fun-bg flex flex-col items-center pb-12">
      <div className="w-full max-w-sm flex flex-col items-center">

        {/* Language picker — top right */}
        <div className="w-full flex justify-end px-5 pt-4">
          <div className="flex gap-1">
            {(["en", "es", "fr"] as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold font-body transition-all"
                style={{
                  background: lang === l ? "hsl(220 88% 57% / 0.2)" : "hsl(220 16% 16%)",
                  color: lang === l ? "hsl(220 88% 70%)" : "hsl(215 12% 45%)",
                  border: `1.5px solid ${lang === l ? "hsl(220 88% 57% / 0.5)" : "hsl(220 15% 24%)"}`,
                }}
              >
                {l === "en" ? "🇬🇧" : l === "es" ? "🇪🇸" : "🇫🇷"} {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Hero section */}
        <div className="w-full relative overflow-hidden pt-8 pb-8 px-6 text-center hero-gradient">
          <div className="text-6xl mb-3 animate-float inline-block select-none" aria-hidden="true">⚽</div>
          <h1 className="font-display leading-none mb-1" style={{ fontSize: "clamp(3rem, 16vw, 3.8rem)", color: "#fff", textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}>
            CAPTAINS
          </h1>
          <h2 className="font-display leading-none mb-4" style={{ fontSize: "clamp(2rem, 12vw, 2.6rem)", color: "hsl(45 95% 55%)", textShadow: "0 0 30px hsl(45 95% 55% / 0.5)" }}>
            WHEEL GAME
          </h2>
          <div className="inline-flex items-center gap-2 bg-white/8 border border-white/15 rounded-full px-4 py-2 mb-2">
            <span className="text-sm font-body" style={{ color: "hsl(215 12% 80%)" }}>🔥 {T.tagline}</span>
          </div>
          <p className="text-xs font-body tracking-widest uppercase mt-2" style={{ color: "hsl(215 12% 40%)" }}>
            {T.by}
          </p>
        </div>

        {/* ── Challenge Wheel + Points System ───────────────────────── */}
        <div className="w-full px-6 mb-8">
          <h3 className="font-display text-center mb-1" style={{ color: "hsl(215 12% 60%)", fontSize: "1rem", letterSpacing: "0.15em" }}>
            SPIN THE WHEEL
          </h3>
          <p className="text-xs font-body text-center mb-5" style={{ color: "hsl(215 12% 42%)" }}>
            Every round draws a random challenge — harder as you go.
          </p>

          {/* Wheel — idle animation only */}
          <div className="flex justify-center">
            <ChallengeWheel
              spinning={false}
              targetIndex={0}
              onDone={() => {}}
              size={240}
              idle={true}
            />
          </div>

          {/* Color tier legend — 4 difficulty tiers */}
          <div className="w-full grid grid-cols-4 gap-2 mt-4">
            {[
              { color: "#22d3ee", label: "BEGINNER",     moves: "Right · Left" },
              { color: "#22c55e", label: "CONTROL",      moves: "Alt · Best" },
              { color: "#f97316", label: "ADVANCED",     moves: "In · Out" },
              { color: "#a855f7", label: "PRO",          moves: "Laces" },
            ].map(t => (
              <div key={t.label} className="flex flex-col items-center gap-1 rounded-xl py-2" style={{ background: t.color + "12" }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                <span className="font-display text-center" style={{ color: t.color, fontSize: "0.48rem", letterSpacing: "0.06em" }}>{t.label}</span>
                <span className="font-body text-center" style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.42rem" }}>{t.moves}</span>
              </div>
            ))}
          </div>
          <p className="text-center mt-2 text-xs font-body" style={{ color: "hsl(215 12% 35%)" }}>👑 LACES→IN→OUT = Captain level combo</p>
        </div>

        {/* Train Alone */}
        <div className="w-full px-6 mb-4">
          <button data-testid="button-solo-practice" onClick={() => navigate("/solo")} className="w-full py-4 rounded-2xl font-display text-lg font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            style={{ background: "#ffffff", color: "hsl(220 20% 15%)" }}>
            🏋️ TRAIN ALONE
            <span className="block text-xs font-body font-normal mt-0.5" style={{ color: "hsl(220 20% 45%)" }}>Beat your own record</span>
          </button>
        </div>

        {/* Main buttons */}
        <div className="w-full flex flex-col gap-3 px-6 mb-6">
          <button data-testid="button-create-game" onClick={() => navigate("/create")} className="btn-yellow w-full glow-yellow text-xl py-5">
            {T.playWithFriends}
          </button>
          <button data-testid="button-join-game" onClick={() => navigate("/join")} className="btn-captains w-full text-xl py-5">
            {T.joinGame}
          </button>
        </div>

        {/* Leaderboard */}
        <button onClick={() => navigate("/leaderboard")} className="text-sm font-body mb-8 transition-colors flex items-center gap-1.5"
          style={{ color: "hsl(215 12% 50%)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "hsl(220 88% 65%)")}
          onMouseLeave={e => (e.currentTarget.style.color = "hsl(215 12% 50%)")}>
          {T.hallOfFame}
        </button>

        {/* How to play */}
        <div className="w-full px-6 mb-8">
          <h3 className="font-display text-center mb-5" style={{ color: "hsl(215 12% 60%)", fontSize: "1rem", letterSpacing: "0.15em" }}>
            {T.howItWorks}
          </h3>
          <div className="space-y-3">
            {HOW_TO_PLAY.map((step, i) => (
              <div key={i} className="flex items-center gap-4 fun-card p-4" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="step-icon" style={{ background: step.bg }}><span>{step.icon}</span></div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-base leading-tight" style={{ color: step.color }}>{step.title}</div>
                  <div className="text-xs font-body mt-0.5 leading-snug" style={{ color: "hsl(215 12% 58%)" }}>{step.text}</div>
                </div>
                <div className="font-display text-2xl" style={{ color: "hsl(215 12% 30%)" }}>{i + 1}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Drops rule */}
        <div className="w-full px-6">
          <div className="fun-card p-4 text-center rounded-2xl" style={{ border: "1.5px solid hsl(220 88% 57% / 0.3)", background: "hsl(220 88% 57% / 0.06)" }}>
            <div className="text-2xl mb-1">💡</div>
            <p className="font-display text-sm" style={{ color: "hsl(220 88% 75%)" }}>{T.dropsRule}</p>
            <p className="text-xs font-body mt-1" style={{ color: "hsl(215 12% 50%)" }}>{T.dropsRuleSub}</p>
          </div>
        </div>

      </div>
    </div>
  );
}
