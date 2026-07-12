import { useLocation } from "wouter";

export default function BrandHeader() {
  const [, navigate] = useLocation();

  return (
    <div
      className="w-full flex items-center justify-center gap-2 py-3 px-4 border-b"
      style={{
        background: "hsl(220 20% 8%)",
        borderColor: "hsl(220 15% 18%)",
        cursor: "pointer",
      }}
      onClick={() => navigate("/")}
      role="button"
    >
      {/* Ball icon */}
      <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>⚽</span>

      <span
        className="font-display text-white"
        style={{ fontSize: "1.05rem", letterSpacing: "0.01em", lineHeight: 1 }}
      >
        CAPTAINS
      </span>
      <span
        className="font-display"
        style={{ fontSize: "0.85rem", letterSpacing: "0.18em", lineHeight: 1, color: "hsl(45 95% 55%)" }}
      >
        WHEEL GAME
      </span>
    </div>
  );
}
