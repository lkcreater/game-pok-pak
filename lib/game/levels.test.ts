import { expect, test } from "vitest";
import { Cell, parseMap } from "./grid";
import { ITEMS } from "./items";
import { LEVELS } from "./levels";

test.each(LEVELS)("$id is valid", (l) => {
  const g = parseMap(l.map);
  expect(g.cells.includes(Cell.Brick)).toBe(true);
  expect(l.stars[0]).toBeLessThan(l.stars[1]);
  expect(l.balls).toBeGreaterThan(0);
  for (const id of [...(l.items?.guaranteed ?? []), ...(l.items?.pool ?? [])]) expect(ITEMS).toHaveProperty(id);
});

test("ids unique", () => expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length));
test("at least 3 levels", () => expect(LEVELS.length).toBeGreaterThanOrEqual(3));
