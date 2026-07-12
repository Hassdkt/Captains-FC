import { db } from "./db";
import {
  rooms, players, rounds, finishes, leaderboard,
  MODE_INFO, pickChallenge, positionPoints,
} from "../shared/schema";
import type {
  Room, Player, Round, Finish, LeaderboardEntry,
  InsertFinish, GameMode,
} from "../shared/schema";
import { eq, and, desc } from "drizzle-orm";

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "CAP-" + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export interface FullGameState {
  room: Room;
  players: Player[];
  currentRound: Round | null;
  finishes: Finish[];
}

export interface IStorage {
  createRoom(mode: GameMode): Room;
  getRoom(id: number): Room | undefined;
  getRoomByCode(code: string): Room | undefined;
  updateRoom(id: number, data: Partial<Room>): Room | undefined;

  addPlayer(roomId: number, name: string, avatar: string, isHost: boolean): Player;
  getPlayers(roomId: number): Player[];
  getPlayer(id: number): Player | undefined;
  updatePlayer(id: number, data: Partial<Player>): Player | undefined;
  removePlayer(id: number): void;

  createRound(roomId: number, roundNumber: number): Round;
  getRound(id: number): Round | undefined;
  getCurrentRound(roomId: number): Round | undefined;

  recordFinish(roundId: number, playerId: number): Finish;
  getFinishes(roundId: number): Finish[];

  startGame(roomId: number): void;
  resolveRound(roomId: number): void;
  submitToLeaderboard(roomId: number): LeaderboardEntry;
  submitSoloToLeaderboard(data: { mode: string; name: string; avatar: string; score: number }): LeaderboardEntry;
  getLeaderboard(mode?: string): LeaderboardEntry[];
  getFullState(roomId: number): FullGameState;
}

export class Storage implements IStorage {
  createRoom(mode: GameMode): Room {
    const info = MODE_INFO[mode];
    return db.insert(rooms).values({
      roomCode: randomCode(),
      mode,
      maxRounds: info.rounds,
      status: "lobby",
      currentRound: 0,
      currentPhase: "lobby",
    }).returning().get()!;
  }

  getRoom(id: number) { return db.select().from(rooms).where(eq(rooms.id, id)).get(); }
  getRoomByCode(code: string) { return db.select().from(rooms).where(eq(rooms.roomCode, code)).get(); }
  updateRoom(id: number, data: Partial<Room>) {
    return db.update(rooms).set(data).where(eq(rooms.id, id)).returning().get();
  }

  addPlayer(roomId: number, name: string, avatar: string, isHost: boolean): Player {
    return db.insert(players).values({ roomId, name, avatar, isHost: isHost ? 1 : 0, totalScore: 0 }).returning().get()!;
  }
  getPlayers(roomId: number) { return db.select().from(players).where(eq(players.roomId, roomId)).all(); }
  getPlayer(id: number) { return db.select().from(players).where(eq(players.id, id)).get(); }
  updatePlayer(id: number, data: Partial<Player>) {
    return db.update(players).set(data).where(eq(players.id, id)).returning().get();
  }
  removePlayer(id: number) { db.delete(players).where(eq(players.id, id)).run(); }

  createRound(roomId: number, roundNumber: number): Round {
    const challenge = pickChallenge(roundNumber);
    return db.insert(rounds).values({
      roomId,
      roundNumber,
      challengeName: challenge.name,
      challengeTarget: challenge.target,
      status: "active",
    }).returning().get()!;
  }
  getRound(id: number) { return db.select().from(rounds).where(eq(rounds.id, id)).get(); }
  getCurrentRound(roomId: number) {
    const room = this.getRoom(roomId);
    if (!room || room.currentRound === 0) return undefined;
    return db.select().from(rounds).where(
      and(eq(rounds.roomId, roomId), eq(rounds.roundNumber, room.currentRound))
    ).get();
  }

  recordFinish(roundId: number, playerId: number): Finish {
    // Count existing finishes to determine position
    const existing = this.getFinishes(roundId);
    // Prevent duplicate finish for same player
    const alreadyFinished = existing.find(f => f.playerId === playerId);
    if (alreadyFinished) return alreadyFinished;

    const position = existing.length + 1; // 1-based
    const points = positionPoints(position - 1); // 0-indexed for lookup
    return db.insert(finishes).values({
      roundId,
      playerId,
      position,
      points,
      finishedAt: Date.now(),
    }).returning().get()!;
  }

  getFinishes(roundId: number) {
    return db.select().from(finishes).where(eq(finishes.roundId, roundId)).all();
  }

  startGame(roomId: number) {
    // Create round 1 with a challenge from pool level 1
    this.createRound(roomId, 1);
    this.updateRoom(roomId, { status: "active", currentRound: 1, currentPhase: "reveal" });
  }

  resolveRound(roomId: number) {
    const room = this.getRoom(roomId)!;
    const currentRound = this.getCurrentRound(roomId)!;
    const roundFinishes = this.getFinishes(currentRound.id);
    const ps = this.getPlayers(roomId);

    // Award points to players who finished; others get 0
    for (const finish of roundFinishes) {
      const p = ps.find(p => p.id === finish.playerId);
      if (p) {
        db.update(players)
          .set({ totalScore: (p.totalScore || 0) + finish.points })
          .where(eq(players.id, p.id))
          .run();
      }
    }

    // Mark round finished
    db.update(rounds).set({ status: "finished" }).where(eq(rounds.id, currentRound.id)).run();

    // Advance
    const nextRound = room.currentRound + 1;
    if (nextRound > room.maxRounds) {
      this.updateRoom(roomId, { status: "finished", currentPhase: "finished" });
    } else {
      this.createRound(roomId, nextRound);
      this.updateRoom(roomId, { currentRound: nextRound, currentPhase: "reveal" });
    }
  }

  submitToLeaderboard(roomId: number): LeaderboardEntry {
    const room = this.getRoom(roomId)!;
    const ps = this.getPlayers(roomId).sort((a, b) => b.totalScore - a.totalScore);
    const winner = ps[0];
    const allScores = ps.map(p => ({ name: p.name, avatar: p.avatar, score: p.totalScore }));
    return db.insert(leaderboard).values({
      roomId,
      mode: room.mode,
      winnerName: winner.name,
      winnerAvatar: winner.avatar,
      winnerScore: winner.totalScore,
      allScores: JSON.stringify(allScores),
      createdAt: Math.floor(Date.now() / 1000),
    }).returning().get()!;
  }

  submitSoloToLeaderboard(data: { mode: string; name: string; avatar: string; score: number }): LeaderboardEntry {
    return db.insert(leaderboard).values({
      roomId: 0, // 0 = solo run (no room)
      mode: data.mode,
      winnerName: data.name,
      winnerAvatar: data.avatar,
      winnerScore: data.score,
      allScores: JSON.stringify([{ name: data.name, avatar: data.avatar, score: data.score }]),
      createdAt: Math.floor(Date.now() / 1000),
    }).returning().get()!;
  }

  getLeaderboard(mode?: string): LeaderboardEntry[] {
    if (mode) {
      return db.select().from(leaderboard)
        .where(eq(leaderboard.mode, mode))
        .orderBy(desc(leaderboard.winnerScore))
        .all();
    }
    return db.select().from(leaderboard).orderBy(desc(leaderboard.winnerScore)).all();
  }

  getFullState(roomId: number): FullGameState {
    const room = this.getRoom(roomId)!;
    const ps = this.getPlayers(roomId);
    const currentRound = this.getCurrentRound(roomId) ?? null;
    const roundFinishes = currentRound ? this.getFinishes(currentRound.id) : [];
    return { room, players: ps, currentRound, finishes: roundFinishes };
  }
}

export const storage = new Storage();
