import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../shared/schema";
import { existsSync, unlinkSync } from "fs";

// ── Wipe old DB for V2 schema migration ──────────────────────────────────────
const DB_PATH = "data.db";
if (existsSync(DB_PATH)) {
  unlinkSync(DB_PATH);
  console.log("[db] Wiped old database for V2 schema migration");
}

const sqlite = new Database(DB_PATH);
export const db = drizzle(sqlite, { schema });

// ── V2 Schema ─────────────────────────────────────────────────────────────────
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'lobby',
    mode TEXT NOT NULL DEFAULT 'challenger',
    current_round INTEGER NOT NULL DEFAULT 0,
    max_rounds INTEGER NOT NULL DEFAULT 3,
    current_phase TEXT NOT NULL DEFAULT 'lobby'
  );

  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL DEFAULT '🔵',
    is_host INTEGER NOT NULL DEFAULT 0,
    total_score INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS rounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    round_number INTEGER NOT NULL,
    challenge_name TEXT NOT NULL,
    challenge_target INTEGER NOT NULL DEFAULT 10,
    status TEXT NOT NULL DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS finishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    round_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    finished_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    mode TEXT NOT NULL,
    winner_name TEXT NOT NULL,
    winner_avatar TEXT NOT NULL,
    winner_score INTEGER NOT NULL,
    all_scores TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL
  );
`);
