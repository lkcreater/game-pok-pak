import { expect, test } from "vitest";
import type { Level } from "./game/levels";
import { SAVE_KEY, isUnlocked, loadSave, recordResult, writeSave, type SaveData } from "./save";

const memStore = () => {
  const m = new Map<string, string>();
  return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};
const DEFAULT: SaveData = { name: "", levels: {} };

test("round-trip", () => {
  const s = memStore();
  const data = { name: "SwiftComet-482", levels: { classic: { best: 1580, stars: 2 } } };
  writeSave(data, s);
  expect(s.m.has(SAVE_KEY)).toBe(true);
  expect(loadSave(s)).toEqual(data);
});

test("empty store → default", () => expect(loadSave(memStore())).toEqual(DEFAULT));

test("invalid JSON → default", () => {
  const s = memStore();
  s.m.set(SAVE_KEY, "{nope");
  expect(loadSave(s)).toEqual(DEFAULT);
});

test("getItem throws → default; setItem throws → no throw", () => {
  const bad = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("quota"); } };
  expect(loadSave(bad)).toEqual(DEFAULT);
  expect(() => writeSave(DEFAULT, bad)).not.toThrow();
});

test("null store → default, write is a no-op", () => {
  expect(loadSave(null)).toEqual(DEFAULT);
  expect(() => writeSave(DEFAULT, null)).not.toThrow();
});

test("bad level entries are dropped, good ones kept", () => {
  const s = memStore();
  s.m.set(SAVE_KEY, JSON.stringify({ name: 7, levels: { a: { best: 10, stars: 1 }, b: { best: "x" }, c: null } }));
  expect(loadSave(s)).toEqual({ name: "", levels: { a: { best: 10, stars: 1 } } });
});

test("recordResult keeps max best and max stars", () => {
  const d: SaveData = { name: "n", levels: { a: { best: 500, stars: 3 } } };
  expect(recordResult(d, "a", 300, 1).levels.a).toEqual({ best: 500, stars: 3 });
  expect(recordResult(d, "a", 900, 2).levels.a).toEqual({ best: 900, stars: 3 });
  expect(recordResult(d, "new", 100, 1).levels.new).toEqual({ best: 100, stars: 1 });
  expect(d.levels.a).toEqual({ best: 500, stars: 3 }); // pure
});

test("isUnlocked: first always; next needs ≥1 star on previous", () => {
  const levels = [{ id: "a" }, { id: "b" }, { id: "c" }] as Level[];
  const d: SaveData = { name: "n", levels: { a: { best: 1, stars: 1 }, b: { best: 0, stars: 0 } } };
  expect(isUnlocked(DEFAULT, levels, 0)).toBe(true);
  expect(isUnlocked(DEFAULT, levels, 1)).toBe(false);
  expect(isUnlocked(d, levels, 1)).toBe(true);
  expect(isUnlocked(d, levels, 2)).toBe(false);
});
