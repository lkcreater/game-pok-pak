import type { Level } from "./levels";

export function timeBonus(par: number, elapsed: number): number {
  return Math.floor(Math.max(0, par - elapsed) * 20);
}

export function starsFor(level: Level, won: boolean, score: number): 0 | 1 | 2 | 3 {
  if (!won) return 0;
  return score >= level.stars[1] ? 3 : score >= level.stars[0] ? 2 : 1;
}
