import { expect, test } from "vitest";
import { BALL_SPEED, CELL, MAX_BALLS, PADDLE_W } from "./constants";
import { Game } from "./engine";
import { Cell, cellAt } from "./grid";
import { ITEMS } from "./items";
import { LEVELS, type Level } from "./levels";

const lvl = (map: string[], extra: Partial<Level> = {}): Level => ({
  id: "t", name: "t", map, balls: 1, par: 10, stars: [1, 2], ...extra,
});
const rows = (n: number, row: string) => Array.from({ length: n }, () => row);
const run = (g: Game, steps: number) => { for (let i = 0; i < steps; i++) g.step(); };
const playing = (level: Level, rng: () => number = () => 0.5) => { const g = new Game(level, rng); g.launch(); return g; };
const ball = (x: number, y: number, vy = -BALL_SPEED) => ({ x, y, vx: 0, vy });

test("guaranteed items are hidden in distinct bricks", () => {
  const g = new Game(lvl(["BBBBB.....", ...rows(9, "..........")], { items: { guaranteed: ["x3", "up1", "boardx1"] } }));
  expect(g.hidden.size).toBe(3);
  expect([...g.hidden.values()].sort()).toEqual(["boardx1", "up1", "x3"]);
  for (const i of g.hidden.keys()) expect(i).toBeLessThan(5);
});

test("more guaranteed items than bricks → extras ignored", () => {
  const g = new Game(lvl(["B.........", ...rows(9, "..........")], { items: { guaranteed: ["x3", "up1", "x2"] } }));
  expect(g.hidden.size).toBe(1);
});

test("breaking a hidden brick spawns its drop at the cell center", () => {
  const g = playing(lvl(["BBBBBBBBBB", "BBBBBBBBBB", ...rows(8, "..........")], { items: { guaranteed: ["up3"] } }));
  g.hidden.clear();
  g.hidden.set(15, "up3"); // row 1, col 5
  g.balls = [ball(66, 60)];
  run(g, 20);
  expect(g.drops).toHaveLength(1);
  expect(g.drops[0].item).toBe("up3");
  expect(g.drops[0].x).toBe(5 * CELL + CELL / 2);
});

test("pool drops respect dropChance via rng", () => {
  const level = lvl(["BBBBBBBBBB", ...rows(9, "..........")], { items: { pool: ["fire"], dropChance: 0.5 } });
  const yes = playing(level, () => 0);
  yes.balls = [ball(66, 60)];
  run(yes, 20);
  expect(yes.drops.map((d) => d.item)).toEqual(["fire"]);
  const no = playing(level, () => 0.99);
  no.balls = [ball(66, 60)];
  run(no, 20);
  expect(no.drops).toHaveLength(0);
});

test("catching a drop applies the item and scores 50", () => {
  const g = playing(lvl(rows(10, "B.........")));
  g.balls = [ball(60, 60)];
  g.drops = [{ x: g.paddle.x, y: g.paddleY - 5, item: "up3" }];
  g.step();
  expect(g.balls).toHaveLength(4);
  expect(g.score).toBe(50);
  expect(g.drops).toHaveLength(0);
});

test("missed drop is removed below the screen", () => {
  const g = playing(lvl(rows(10, "B.........")));
  g.setPaddleX(36);
  g.balls = [ball(60, 60)];
  g.drops = [{ x: g.width - 5, y: g.height - 1, item: "x3" }];
  g.step();
  expect(g.drops).toHaveLength(0);
  expect(g.balls).toHaveLength(1);
});

test("x3 triples balls", () => {
  const g = playing(lvl(rows(10, "B.........")));
  g.balls = [ball(30, 60), ball(40, 60), ball(50, 60), ball(60, 60)];
  g.multiplyBalls(3);
  expect(g.balls).toHaveLength(12);
  for (const b of g.balls) expect(Math.hypot(b.vx, b.vy)).toBeCloseTo(BALL_SPEED);
});

test("repeated x3 never exceeds MAX_BALLS", () => {
  const g = playing(lvl(rows(10, "B.........")));
  g.balls = Array.from({ length: 200 }, () => ball(60, 60));
  g.multiplyBalls(3);
  g.multiplyBalls(3);
  g.addBalls(3);
  expect(g.balls).toHaveLength(MAX_BALLS);
});

test("growPaddle is permanent and caps at 2x", () => {
  const g = playing(lvl(rows(10, "B.........")));
  g.growPaddle(1);
  expect(g.paddle.w).toBe(PADDLE_W * 1.25);
  g.growPaddle(10);
  expect(g.paddle.w).toBe(PADDLE_W * 2);
});

test("setFire resets (not adds), then expires", () => {
  const g = playing(lvl(rows(10, "B.........")));
  g.setPaddleX(60);
  g.balls = [ball(60, 60)];
  g.setFire(8);
  g.setFire(3);
  expect(g.fireLeft).toBe(3);
  run(g, 372);
  expect(g.status).toBe("playing");
  expect(g.fireLeft).toBe(0);
});

// ---- special items ----

test("laser breaks every brick in the columns above the paddle, through walls", () => {
  const map = rows(10, "BBBBBBBBBB");
  map[3] = "##########";
  const g = playing(lvl(map));
  g.setPaddleX(60); // paddle 72px wide → x 24..96 → columns 2..7
  g.laser();
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const expected = r === 3 ? Cell.Wall : c >= 2 && c <= 7 ? Cell.Empty : Cell.Brick;
      expect(cellAt(g.grid, c, r)).toBe(expected);
    }
  }
  expect(g.score).toBe(9 * 6 * 10);
  expect(g.laserAt).toBe(g.elapsed);
});

test("shield bounces falling balls at the bottom, then expires", () => {
  const g = playing(lvl(rows(10, "B.........")));
  g.setPaddleX(100); // keeps the ball alive after the shield bounce
  g.setShield(1);
  g.balls = [ball(100, g.height - 2, BALL_SPEED)];
  g.step();
  expect(g.balls).toHaveLength(1);
  expect(g.balls[0].vy).toBeLessThan(0);
  run(g, 130); // > 1s
  expect(g.status).toBe("playing");
  expect(g.shieldLeft).toBe(0);
  g.balls = [ball(100, g.height - 1, BALL_SPEED)];
  g.step();
  expect(g.balls).toHaveLength(0);
});

test("bomb: a brick hit also breaks its 3x3 neighbourhood (bricks only), then expires", () => {
  const map = rows(10, "..........");
  map[1] = "...###....";
  map[2] = "..BBBBB...";
  map[3] = "..BBBBB...";
  map[9] = "B.........";
  const g = playing(lvl(map));
  g.setBomb(6);
  g.balls = [ball(4 * CELL + 6, 60)]; // column 4, moving up into row 3
  run(g, 20);
  expect([3, 4, 5].map((c) => cellAt(g.grid, c, 2))).toEqual([Cell.Empty, Cell.Empty, Cell.Empty]);
  expect([3, 4, 5].map((c) => cellAt(g.grid, c, 3))).toEqual([Cell.Empty, Cell.Empty, Cell.Empty]);
  expect(cellAt(g.grid, 2, 3)).toBe(Cell.Brick);
  expect(cellAt(g.grid, 4, 1)).toBe(Cell.Wall);

  const g2 = playing(lvl(rows(10, "B.........")));
  g2.setPaddleX(60);
  g2.balls = [ball(60, 60)]; // bounces straight up/down over the paddle centre
  g2.setBomb(1);
  run(g2, 130);
  expect(g2.status).toBe("playing");
  expect(g2.bombLeft).toBe(0);
});

test("special items are in the registry and in every level's guaranteed list", () => {
  for (const id of ["laser", "shield", "bomb"] as const) expect(ITEMS).toHaveProperty(id);
  for (const l of LEVELS) expect(l.items?.guaranteed).toEqual(expect.arrayContaining(["laser", "shield", "bomb"]));
});
