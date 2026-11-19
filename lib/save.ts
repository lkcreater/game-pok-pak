import type { Level } from "./game/levels";

export type LevelRecord = { best: number; stars: number };
export type SaveData = { name: string; levels: Record<string, LevelRecord> };
export const SAVE_KEY = "pokpak:v1";

type Store = Pick<Storage, "getItem" | "setItem">;

const defaultStore = (): Store | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // access itself can throw (blocked storage)
  }
};

const isRecord = (v: unknown): v is LevelRecord =>
  typeof v === "object" && v !== null &&
  Number.isFinite((v as LevelRecord).best) &&
  Number.isInteger((v as LevelRecord).stars) && (v as LevelRecord).stars >= 0 && (v as LevelRecord).stars <= 3;

export function loadSave(store: Store | null = defaultStore()): SaveData {
  const data: SaveData = { name: "", levels: {} };
  try {
    const raw = JSON.parse(store?.getItem(SAVE_KEY) ?? "null");
    if (typeof raw?.name === "string") data.name = raw.name;
    if (raw?.levels && typeof raw.levels === "object") {
      for (const [id, rec] of Object.entries(raw.levels)) {
        if (isRecord(rec)) data.levels[id] = { best: rec.best, stars: rec.stars };
      }
    }
  } catch {
    // corrupt or unavailable → defaults
  }
  return data;
}

export function writeSave(data: SaveData, store: Store | null = defaultStore()): void {
  try {
    store?.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // storage full/blocked — game keeps working, just doesn't remember
  }
}

export function recordResult(data: SaveData, levelId: string, score: number, stars: number): SaveData {
  const prev = data.levels[levelId] ?? { best: 0, stars: 0 };
  return {
    ...data,
    levels: { ...data.levels, [levelId]: { best: Math.max(prev.best, score), stars: Math.max(prev.stars, stars) } },
  };
}

export function isUnlocked(data: SaveData, levels: Level[], index: number): boolean {
  return index === 0 || (data.levels[levels[index - 1]?.id]?.stars ?? 0) >= 1;
}
