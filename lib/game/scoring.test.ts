import { expect, test } from "vitest";
import type { Level } from "./levels";
import { starsFor, timeBonus } from "./scoring";

const L = { stars: [100, 200] } as Level;

test("timeBonus", () => {
  expect(timeBonus(60, 50.5)).toBe(190);
  expect(timeBonus(60, 90)).toBe(0);
});

test("stars", () => {
  expect(starsFor(L, false, 999)).toBe(0);
  expect(starsFor(L, true, 0)).toBe(1);
  expect(starsFor(L, true, 100)).toBe(2);
  expect(starsFor(L, true, 200)).toBe(3);
});
