import { apiRequest } from "@/lib/queryClient";

export interface PlayerProfile {
  name: string;
  avatar: string;
}

// Generate a random device ID once per app session (in-memory, no localStorage)
function makeId() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

// Module-level device ID — persists for the lifetime of the page
export const deviceId: string = makeId();

// Cache so we don't hit the server on every render
let _cached: PlayerProfile | null = null;
let _loaded = false;

export async function fetchProfile(): Promise<PlayerProfile | null> {
  if (_loaded) return _cached;
  try {
    const res = await apiRequest("GET", `/api/profile/${deviceId}`);
    if (!res.ok) { _loaded = true; _cached = null; return null; }
    _cached = await res.json();
    _loaded = true;
    return _cached;
  } catch {
    _loaded = true;
    return null;
  }
}

export async function saveProfile(profile: PlayerProfile): Promise<void> {
  _cached = profile;
  _loaded = true;
  try {
    await apiRequest("POST", "/api/profile", { deviceId, ...profile });
  } catch {
    // ignore
  }
}

export function getCachedProfile(): PlayerProfile | null {
  return _cached;
}
