import { expect, test } from "vitest";
import { Cell, cellAt, parseMap } from "./grid";

test("parses legend", () => {
  const g = parseMap(["#B.", "..B"]);
  expect([g.cols, g.rows]).toEqual([3, 2]);
  expect(cellAt(g, 0, 0)).toBe(Cell.Wall);
  expect(cellAt(g, 1, 0)).toBe(Cell.Brick);
  expect(cellAt(g, 2, 0)).toBe(Cell.Empty);
  expect(cellAt(g, 9, 9)).toBe(Cell.Empty);
  expect(cellAt(g, -1, 0)).toBe(Cell.Empty);
});

test("rejects ragged rows", () => expect(() => parseMap(["##", "#"])).toThrow());
test("rejects unknown char", () => expect(() => parseMap(["#X"])).toThrow());
