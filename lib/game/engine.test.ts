import { expect, test } from "vitest";
import { BALL_SPEED, CELL, FIXED_DT, MAX_BOUNCE_DEG, MIN_VY_RATIO } from "./constants";
import { Game } from "./engine";
import { Cell, cellAt } from "./grid";
import type { Level } from "./levels";
import { timeBonus } from "./scoring";

const lvl = (map: string[], extra: Partial<Level> = {}): Level => ({
  id: "t", name: "t", map, balls: 1, par: 10, stars: [1, 2], ...extra,
});
const rows = (n: number, row: string) => Array.from({ length: n }, () => row);
const speed = (b: { vx: number; vy: number }) => Math.hypot(b.vx, b.vy);
const run = (g: Game, steps: number) => { for (let i = 0; i < steps; i++) g.step(); };
const playing = (level: Level) => { const g = new Game(level, () => 0.5); g.launch(); return g; };

test("starts ready with level.balls on the paddle; launch sends all up at BALL_SPEED", () => {
  const g = new Game(lvl(rows(10, "B........."), { balls: 4 }), () => 0.5);
  expect(g.status).toBe("ready");
  expect(g.balls).toHaveLength(4);
  g.setPaddleX(30);
  for (const b of g.balls) expect(Math.abs(b.x - g.paddle.x)).toBeLessThanOrEqual(g.paddle.w / 2);
  g.launch();
  expect(g.status).toBe("playing");
  for (const b of g.balls) {
    expect(b.vy).toBeLessThan(0);
    expect(speed(b)).toBeCloseTo(BALL_SPEED);
  }
});

test("a step never moves a ball more than CELL/2", () => {
  expect(BALL_SPEED * FIXED_DT).toBeLessThanOrEqual(CELL / 2);
});

test("reflects off a wall without entering it", () => {
  const g = playing(lvl(["##########", ...rows(9, ".........B")]));
  g.balls = [{ x: 60, y: 60, vx: 0, vy: -BALL_SPEED }];
  for (let i = 0; i < 60; i++) { g.step(); expect(g.balls[0].y).toBeGreaterThanOrEqual(CELL); }
  expect(g.balls[0].vy).toBeGreaterThan(0);
  expect(cellAt(g.grid, 5, 0)).toBe(Cell.Wall);
});

test("breaks a brick: scores 10, reflects, records index", () => {
  const g = playing(lvl(["BBBBBBBBBB", ...rows(9, "..........")]));
  g.balls = [{ x: 66, y: 60, vx: 0, vy: -BALL_SPEED }];
  run(g, 60);
  expect(g.score).toBe(10);
  expect(g.brokenCells).toEqual([5]);
  expect(g.bricksLeft).toBe(9);
  expect(g.balls[0].vy).toBeGreaterThan(0);
});

test("diagonal corner hit breaks the corner brick (no tunnelling)", () => {
  const map = rows(10, "..........");
  map[5] = ".....B....";
  map[9] = "B.........";
  const g = playing(lvl(map));
  const v = BALL_SPEED / Math.SQRT2;
  g.balls = [{ x: 54, y: 54, vx: v, vy: v }];
  run(g, 30);
  expect(cellAt(g.grid, 5, 5)).toBe(Cell.Empty);
});

test("fire: breaks without reflecting", () => {
  const map = rows(12, "..........");
  map[1] = map[2] = map[3] = ".....B....";
  map[11] = "B.........";
  const g = playing(lvl(map));
  g.fireLeft = 5;
  g.balls = [{ x: 66, y: 102, vx: 0, vy: -BALL_SPEED }];
  run(g, 32);
  expect([1, 2, 3].map((r) => cellAt(g.grid, 5, r))).toEqual([Cell.Empty, Cell.Empty, Cell.Empty]);
  expect(g.balls[0].vy).toBeLessThan(0);
});

test("paddle bounce: center → straight up, edge → MAX_BOUNCE_DEG", () => {
  const g = playing(lvl(rows(10, "B.........")));
  g.setPaddleX(60);
  g.balls = [
    { x: 60, y: g.paddleY - 1, vx: 0, vy: BALL_SPEED },
    { x: 60 + g.paddle.w / 2, y: g.paddleY - 1, vx: 0, vy: BALL_SPEED },
  ];
  g.step();
  const [c, e] = g.balls;
  expect(c.vx).toBeCloseTo(0);
  expect(c.vy).toBeCloseTo(-BALL_SPEED);
  const rad = (MAX_BOUNCE_DEG * Math.PI) / 180;
  expect(e.vx).toBeCloseTo(BALL_SPEED * Math.sin(rad));
  expect(e.vy).toBeCloseTo(-BALL_SPEED * Math.cos(rad));
});

test("ball moving up through the paddle is not reflected", () => {
  const g = playing(lvl(rows(10, "B.........")));
  g.setPaddleX(60);
  g.balls = [{ x: 60, y: g.paddleY + 2, vx: 0, vy: -BALL_SPEED }];
  run(g, 3);
  expect(g.balls[0].vy).toBe(-BALL_SPEED);
});

test("ball falling past the bottom is removed; last one → lost", () => {
  const g = playing(lvl(rows(10, "B.........")));
  g.setPaddleX(20);
  g.balls = [{ x: 110, y: g.height - 1, vx: 0, vy: BALL_SPEED }];
  g.step();
  expect(g.balls).toHaveLength(0);
  expect(g.status).toBe("lost");
});

test("last brick → won with time bonus added", () => {
  const map = rows(10, "..........");
  map[0] = ".....B....";
  const g = playing(lvl(map, { par: 10 }));
  g.balls = [{ x: 66, y: 60, vx: 0, vy: -BALL_SPEED }];
  run(g, 60);
  expect(g.status).toBe("won");
  expect(g.score).toBe(10 + timeBonus(10, g.elapsed));
  const s = g.score; g.step(); expect(g.score).toBe(s); // frozen once won
});

test("never-horizontal: after a reflection |vy| >= MIN_VY_RATIO * BALL_SPEED", () => {
  const g = playing(lvl(rows(10, "B.........")));
  const vy = -0.05 * BALL_SPEED;
  g.balls = [{ x: g.width - 1, y: 60, vx: Math.sqrt(BALL_SPEED ** 2 - vy ** 2), vy }];
  g.step();
  const b = g.balls[0];
  expect(b.vx).toBeLessThan(0);
  expect(Math.abs(b.vy)).toBeGreaterThanOrEqual(MIN_VY_RATIO * BALL_SPEED - 1e-9);
  expect(speed(b)).toBeCloseTo(BALL_SPEED);
});
