import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CARD_INFO, type CardType } from "../../../../shared/schema";

interface WildCardPanelProps {
  playerId: number;
  roundId: number;
  cards: CardType[];
  players: Array<{ id: number; name: string; avatar: string }>;
  currentPhase: string;
  onPlayed: () => void;
}

type Phase = "idle" | "selectTarget" | "played";

export default function WildCardPanel({ playerId, roundId, cards, players, currentPhase, onPlayed }: WildCardPanelProps) {
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [playedCard, setPlayedCard] = useState<CardType | null>(null);

  const PRETEST_CARDS: CardType[] = ["x2"];
  const RETRY_CARDS: CardType[] = ["retry"];
  const POST_CARDS: CardType[] = ["boost", "swap", "steal"];

  const getPlayableCards = () => {
    if (currentPhase === "reveal" || currentPhase === "pretest") return PRETEST_CARDS.filter(c => cards.includes(c));
    if (currentPhase === "retry") return RETRY_CARDS.filter(c => cards.includes(c));
    if (currentPhase === "wildcard") return POST_CARDS.filter(c => cards.includes(c));
    return [];
  };

  const playableCards = getPlayableCards();
  const needsTarget = (ct: CardType) => ct === "swap" || ct === "steal";

  const playCardMutation = useMutation({
    mutationFn: async ({ cardType, targetPlayerId }: { cardType: CardType; targetPlayerId?: number }) => {
      const timing = PRETEST_CARDS.includes(cardType) ? "pretest" : RETRY_CARDS.includes(cardType) ? "retry" : "postScore";
      const res = await apiRequest("POST", `/api/rounds/${roundId}/cards`, {
        playerId,
        cardType,
        targetPlayerId: targetPlayerId ?? null,
        timing,
      });
      return res.json();
    },
    onSuccess: (_, { cardType }) => {
      setPlayedCard(cardType);
      setPhase("played");
      onPlayed();
    },
  });

  const handleCardSelect = (ct: CardType) => {
    if (playedCard) return;
    setSelectedCard(ct);
    if (needsTarget(ct)) {
      setPhase("selectTarget");
    } else {
      playCardMutation.mutate({ cardType: ct });
    }
  };

  const handleTarget = (targetId: number) => {
    if (!selectedCard) return;
    playCardMutation.mutate({ cardType: selectedCard, targetPlayerId: targetId });
  };

  if (playedCard) {
    const info = CARD_INFO[playedCard];
    return (
      <div className="bg-primary/5 border border-primary/30 rounded-2xl p-5 text-center animate-slide-in">
        <div className="text-3xl mb-2">{info.symbol}</div>
        <p className="font-display font-bold text-primary">{info.name} played!</p>
        <p className="text-muted-foreground text-xs mt-1">Card effect will resolve at end of round</p>
      </div>
    );
  }

  return (
    <div>
      {/* All cards in hand */}
      <div className="mb-4">
        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Your Hand ({cards.length}/5)</div>
        <div className="flex flex-wrap gap-3">
          {cards.map((ct, i) => {
            const info = CARD_INFO[ct];
            const isPlayable = playableCards.includes(ct);
            const isSelected = selectedCard === ct;
            return (
              <button
                key={`${ct}-${i}`}
                data-testid={`card-${ct}`}
                onClick={() => isPlayable && handleCardSelect(ct)}
                disabled={!isPlayable || playCardMutation.isPending}
                className={`
                  relative w-20 h-28 rounded-xl border-2 flex flex-col items-center justify-center gap-1 p-2 transition-all
                  wild-card-${ct}
                  ${isPlayable ? "hover:-translate-y-2 hover:shadow-lg cursor-pointer" : "opacity-40 cursor-not-allowed grayscale"}
                  ${isSelected ? "scale-110 ring-2 ring-primary" : ""}
                `}
              >
                <span className="text-2xl font-display font-bold">{info.symbol}</span>
                <span className="text-xs font-bold text-center leading-tight">{info.name}</span>
                {isPlayable && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
          {cards.length === 0 && (
            <p className="text-muted-foreground text-sm">No cards in hand</p>
          )}
        </div>
      </div>

      {/* Target selection */}
      {phase === "selectTarget" && selectedCard && (
        <div className="bg-secondary border border-accent/40 rounded-2xl p-4 animate-slide-in">
          <p className="text-accent font-bold text-sm mb-3">Choose your target for {CARD_INFO[selectedCard].name}:</p>
          <div className="space-y-2">
            {players.filter(p => p.id !== playerId).map(p => (
              <button
                key={p.id}
                onClick={() => handleTarget(p.id)}
                className="w-full flex items-center gap-3 p-3 bg-muted border border-border rounded-xl hover:border-accent hover:bg-accent/5 transition-all"
              >
                <span className="text-xl">{p.avatar}</span>
                <span className="font-semibold">{p.name}</span>
              </button>
            ))}
          </div>
          <button onClick={() => { setSelectedCard(null); setPhase("idle"); }} className="mt-3 text-muted-foreground text-xs w-full text-center">
            Cancel
          </button>
        </div>
      )}

      {playableCards.length === 0 && (
        <div className="bg-muted/50 border border-border rounded-xl p-3 text-center">
          <p className="text-muted-foreground text-xs">No playable cards in this phase</p>
        </div>
      )}
    </div>
  );
}
