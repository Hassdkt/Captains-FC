import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Game Modes ───────────────────────────────────────────────────────────────
export type GameMode = "discovery" | "challenger" | "baller" | "captain";

export const MODE_INFO: Record<GameMode, {
  label: string;
  emoji: string;
  color: string;
  rounds: number;
  tagline: string;
  description: string;
  duration: string;
}> = {
  discovery: {
    label: "Discovery",
    emoji: "👀",
    color: "#22d3ee",
    rounds: 1,
    tagline: "Try the game",
    description: "1 surprise challenge. Perfect first game.",
    duration: "2–3 min",
  },
  challenger: {
    label: "Challenger",
    emoji: "⚡",
    color: "#22c55e",
    rounds: 3,
    tagline: "Quick battle",
    description: "Simple → Control → First Combo",
    duration: "5–8 min",
  },
  baller: {
    label: "Baller",
    emoji: "🔥",
    color: "#f97316",
    rounds: 6,
    tagline: "Skill + combinations",
    description: "Every round harder. Combos start flying.",
    duration: "10–15 min",
  },
  captain: {
    label: "Captain",
    emoji: "👑",
    color: "#eab308",
    rounds: 9,
    tagline: "Full progression",
    description: "Simple to Captain's Final. The full experience.",
    duration: "20–30 min",
  },
};

// ─── Challenge Engine ─────────────────────────────────────────────────────────
// Stages map to round positions:
//  Level 1 (rounds 1–2): single surface
//  Level 2 (rounds 3–4): rhythm / control
//  Level 3 (rounds 5–6): short combos
//  Level 4 (rounds 7–8): multi-step sequences
//  Level 5 (round 9):    Captain's Final

export interface Challenge {
  name: string;        // display name / instruction
  target: number;      // touches to complete
  level: 1 | 2 | 3 | 4 | 5;
}

export const CHALLENGE_POOLS: Record<1 | 2 | 3 | 4 | 5, Challenge[]> = {
  1: [
    { name: "RIGHT FOOT — 10 TOUCHES", target: 10, level: 1 },
    { name: "LEFT FOOT — 10 TOUCHES",  target: 10, level: 1 },
    { name: "RIGHT FOOT — 12 TOUCHES", target: 12, level: 1 },
    { name: "LEFT FOOT — 12 TOUCHES",  target: 12, level: 1 },
    { name: "BEST FOOT — 10 TOUCHES",  target: 10, level: 1 },
  ],
  2: [
    { name: "ALTERNATING — 12 TOUCHES",  target: 12, level: 2 },
    { name: "ALTERNATING — 15 TOUCHES",  target: 15, level: 2 },
    { name: "THIGHS — 10 TOUCHES",       target: 10, level: 2 },
    { name: "INSIDE ONLY — 8 TOUCHES",   target: 8,  level: 2 },
    { name: "OUTSIDE ONLY — 8 TOUCHES",  target: 8,  level: 2 },
  ],
  3: [
    { name: "🔥 2 RIGHT → 2 LEFT → 2 THIGHS",        target: 6,  level: 3 },
    { name: "🔥 5 RIGHT → 5 LEFT",                    target: 10, level: 3 },
    { name: "🔥 3 RIGHT → 3 LEFT → 3 ALTERNATING",    target: 9,  level: 3 },
    { name: "🔥 4 RIGHT → 4 LEFT → 2 THIGHS",         target: 10, level: 3 },
  ],
  4: [
    { name: "⚡ 5 RIGHT → 5 LEFT → 10 ALTERNATING",   target: 20, level: 4 },
    { name: "⚡ 3 LACES → 3 INSIDE → 3 OUTSIDE",       target: 9,  level: 4 },
    { name: "⚡ 4 RIGHT → 4 LEFT → 4 THIGHS",          target: 12, level: 4 },
    { name: "⚡ 5 OUTSIDE → 5 INSIDE → 5 ALTERNATING", target: 15, level: 4 },
  ],
  5: [
    { name: "👑 5 RIGHT → 5 LEFT → 5 ALTERNATING → 3 THIGHS",       target: 18, level: 5 },
    { name: "👑 3 LACES → 3 INSIDE → 3 OUTSIDE → 6 ALTERNATING",    target: 15, level: 5 },
    { name: "👑 2 RIGHT → 2 LEFT → 2 THIGHS — REPEAT ×3",            target: 18, level: 5 },
  ],
};

/** Pick a random challenge from the correct pool for a given round number */
export function pickChallenge(roundNumber: number): Challenge {
  const level = roundToLevel(roundNumber);
  const pool = CHALLENGE_POOLS[level];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function roundToLevel(roundNumber: number): 1 | 2 | 3 | 4 | 5 {
  if (roundNumber <= 2) return 1;
  if (roundNumber <= 4) return 2;
  if (roundNumber <= 6) return 3;
  if (roundNumber <= 8) return 4;
  return 5;
}

// ─── Position Points ──────────────────────────────────────────────────────────
// 1st = 3pts · 2nd = 2pts · 3rd = 1pt · 4th+ = 0pts
export const POSITION_POINTS = [3, 2, 1];
export function positionPoints(position: number): number {
  return POSITION_POINTS[position] ?? 0; // position is 0-indexed
}

// ─── Tables ───────────────────────────────────────────────────────────────────

export const rooms = sqliteTable("rooms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roomCode: text("room_code").notNull().unique(),
  status: text("status").notNull().default("lobby"),      // lobby | active | finished
  mode: text("mode").notNull().default("challenger"),     // discovery | challenger | baller | captain
  currentRound: integer("current_round").notNull().default(0),
  maxRounds: integer("max_rounds").notNull().default(3),
  currentPhase: text("current_phase").notNull().default("lobby"), // lobby | reveal | race | results | finished
});

export const players = sqliteTable("players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roomId: integer("room_id").notNull(),
  name: text("name").notNull(),
  avatar: text("avatar").notNull().default("🔵"),
  isHost: integer("is_host").notNull().default(0),
  totalScore: integer("total_score").notNull().default(0),
});

export const rounds = sqliteTable("rounds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roomId: integer("room_id").notNull(),
  roundNumber: integer("round_number").notNull(),
  challengeName: text("challenge_name").notNull(),
  challengeTarget: integer("challenge_target").notNull().default(10),
  status: text("status").notNull().default("active"),  // active | finished
});

// One row per player per round — records finishing order
export const finishes = sqliteTable("finishes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roundId: integer("round_id").notNull(),
  playerId: integer("player_id").notNull(),
  position: integer("position").notNull(),   // 1-based arrival order
  points: integer("points").notNull().default(0),
  finishedAt: integer("finished_at").notNull(), // unix ms timestamp
});

// Global leaderboard — one entry per game
export const leaderboard = sqliteTable("leaderboard", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roomId: integer("room_id").notNull(),
  mode: text("mode").notNull(),
  winnerName: text("winner_name").notNull(),
  winnerAvatar: text("winner_avatar").notNull(),
  winnerScore: integer("winner_score").notNull(),
  allScores: text("all_scores").notNull().default("[]"), // JSON [{name, avatar, score}]
  createdAt: integer("created_at").notNull(),
});

// ─── Insert schemas ───────────────────────────────────────────────────────────
export const insertRoomSchema = createInsertSchema(rooms).omit({ id: true });
export const insertPlayerSchema = createInsertSchema(players).omit({ id: true });
export const insertRoundSchema = createInsertSchema(rounds).omit({ id: true });
export const insertFinishSchema = createInsertSchema(finishes).omit({ id: true });
export const insertLeaderboardSchema = createInsertSchema(leaderboard).omit({ id: true });

// ─── Types ────────────────────────────────────────────────────────────────────
export type Room = typeof rooms.$inferSelect;
export type Player = typeof players.$inferSelect;
export type Round = typeof rounds.$inferSelect;
export type Finish = typeof finishes.$inferSelect;
export type LeaderboardEntry = typeof leaderboard.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type InsertFinish = z.infer<typeof insertFinishSchema>;

export const AVATARS = ["🔵", "🔴", "🟡", "🟢", "🟣", "🟠"];
