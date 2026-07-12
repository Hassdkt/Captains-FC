import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import type { GameMode } from "../shared/schema";

// In-memory profile store (no localStorage — blocked in iframe)
const profiles = new Map<string, { name: string; avatar: string }>();

export function registerRoutes(httpServer: Server, app: Express) {

  // ── Profile ─────────────────────────────────────────────────────────────────
  app.post("/api/profile", (req, res) => {
    const { deviceId, name, avatar } = req.body;
    if (!deviceId || !name || !avatar) return res.status(400).json({ error: "Missing fields" });
    profiles.set(deviceId, { name, avatar });
    res.json({ ok: true });
  });

  app.get("/api/profile/:deviceId", (req, res) => {
    const p = profiles.get(req.params.deviceId);
    if (!p) return res.status(404).json({ error: "No profile" });
    res.json(p);
  });

  // ── Rooms ────────────────────────────────────────────────────────────────────
  app.post("/api/rooms", (req, res) => {
    const { mode = "challenger" } = req.body;
    const room = storage.createRoom(mode as GameMode);
    res.json(room);
  });

  app.get("/api/rooms/code/:code", (req, res) => {
    const room = storage.getRoomByCode(req.params.code.toUpperCase());
    if (!room) return res.status(404).json({ error: "Room not found" });
    res.json(room);
  });

  app.get("/api/rooms/:id/state", (req, res) => {
    const state = storage.getFullState(Number(req.params.id));
    if (!state.room) return res.status(404).json({ error: "Room not found" });
    res.json(state);
  });

  app.patch("/api/rooms/:id/phase", (req, res) => {
    const { phase } = req.body;
    const room = storage.updateRoom(Number(req.params.id), { currentPhase: phase });
    res.json(room);
  });

  // ── Players ──────────────────────────────────────────────────────────────────
  app.post("/api/rooms/:id/join", (req, res) => {
    const { name, avatar, isHost = false } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });
    const player = storage.addPlayer(Number(req.params.id), name, avatar, isHost);
    res.json(player);
  });

  app.delete("/api/players/:id", (req, res) => {
    storage.removePlayer(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── Game flow ────────────────────────────────────────────────────────────────
  app.post("/api/rooms/:id/start", (req, res) => {
    storage.startGame(Number(req.params.id));
    const state = storage.getFullState(Number(req.params.id));
    res.json(state);
  });

  // Player taps DONE — records their finish position for the current round
  app.post("/api/rooms/:id/done", (req, res) => {
    const { playerId } = req.body;
    const roomId = Number(req.params.id);
    const state = storage.getFullState(roomId);
    if (!state.currentRound) return res.status(400).json({ error: "No active round" });
    const finish = storage.recordFinish(state.currentRound.id, Number(playerId));

    // Auto-resolve round when ALL players have finished
    const finishes = storage.getFinishes(state.currentRound.id);
    const players = storage.getPlayers(roomId);
    if (finishes.length >= players.length) {
      storage.resolveRound(roomId);
    }

    res.json(finish);
  });

  // Host manually resolves round (safety valve if a player didn't tap)
  app.post("/api/rooms/:id/resolve", (req, res) => {
    storage.resolveRound(Number(req.params.id));
    const state = storage.getFullState(Number(req.params.id));
    res.json(state);
  });

  // ── Leaderboard ──────────────────────────────────────────────────────────────
  app.post("/api/rooms/:id/leaderboard", (req, res) => {
    try {
      const entry = storage.submitToLeaderboard(Number(req.params.id));
      res.json(entry);
    } catch (e) {
      res.status(400).json({ error: "Could not submit" });
    }
  });

  app.get("/api/leaderboard", (req, res) => {
    const { mode } = req.query;
    const entries = storage.getLeaderboard(mode as string | undefined);
    res.json(entries);
  });

  // ── Solo Mode ─────────────────────────────────────────────────────────────────
  // Submit a solo run directly to the leaderboard (no room needed)
  app.post("/api/solo/leaderboard", (req, res) => {
    const { mode, name, avatar, score } = req.body;
    if (!mode || !name || !avatar || score == null) {
      return res.status(400).json({ error: "Missing fields" });
    }
    const entry = storage.submitSoloToLeaderboard({ mode, name, avatar, score });
    res.json(entry);
  });

  app.get("/api/rooms/:id/players", (req, res) => {
    res.json(storage.getPlayers(Number(req.params.id)));
  });
}
