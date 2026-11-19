import { expect, test } from "vitest";
import { randomName } from "./names";

test("format is AdjNoun-NNN", () => {
  expect(randomName()).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+-\d{3}$/);
});

test("deterministic with rng", () => {
  expect(randomName(() => 0)).toBe(randomName(() => 0));
  expect(randomName(() => 0)).toMatch(/-100$/);
});
