import {
  BALL_RADIUS, BALL_SPEED, CELL, FIXED_DT, MAX_BOUNCE_DEG, MIN_VY_RATIO, PADDLE_W, PADDLE_ZONE,
} from "./constants";
import { Cell, cellAt, parseMap, type Grid } from "./grid";
import type { GameActions, ItemId } from "./items";
import type { Level } from "./levels";
import { timeBonus } from "./scoring";

export type Ball = { x: number; y: number; vx: number; vy: number };
export type Drop = { x: number; y: number; item: ItemId };
export type Status = "ready" | "playing" | "won" | "lost";

const DEG = Math.PI / 180;

/** DOM-free game state, advanced one FIXED_DT per step(). */
export class Game implements GameActions {
  readonly grid: Grid;
  readonly width: number;
  readonly height: number;
  readonly paddleY: number; // top edge of the paddle
  balls: Ball[] = [];
  drops: Drop[] = [];
  paddle: { x: number; w: number }; // x = center
  score = 0;
  elapsed = 0;
  status: Status = "ready";
  fireLeft = 0;
  bricksLeft: number;
  brokenCells: number[] = []; // drained by the renderer

  constructor(readonly level: Level, protected rng: () => number = Math.random) {
    this.grid = parseMap(level.map);
    this.width = this.grid.cols * CELL;
    this.height = Math.round((this.grid.rows * CELL) / (1 - PADDLE_ZONE));
    this.paddleY = this.height - 40;
    this.bricksLeft = this.grid.cells.filter((c) => c === Cell.Brick).length;
    this.paddle = { x: this.width / 2, w: PADDLE_W };
    for (let i = 0; i < level.balls; i++) this.balls.push({ x: 0, y: 0, vx: 0, vy: 0 });
    this.placeOnPaddle();
  }

  setPaddleX(x: number): void {
    const half = this.paddle.w / 2;
    this.paddle.x = Math.min(this.width - half, Math.max(half, x));
    if (this.status === "ready") this.placeOnPaddle();
  }

  launch(): void {
    if (this.status !== "ready") return;
    const n = this.balls.length;
    this.balls.forEach((b, i) => {
      const deg = n === 1 ? (this.rng() * 2 - 1) * 30 : -30 + (60 * i) / (n - 1);
      b.vx = BALL_SPEED * Math.sin(deg * DEG);
      b.vy = -BALL_SPEED * Math.cos(deg * DEG);
    });
    this.status = "playing";
  }

  step(): void {
    if (this.status !== "playing") return;
    const dt = FIXED_DT;
    this.elapsed += dt;
    this.fireLeft = Math.max(0, this.fireLeft - dt);
    for (let i = this.balls.length - 1; i >= 0; i--) {
      if (!this.moveBall(this.balls[i], dt)) this.balls.splice(i, 1);
    }
    if (this.bricksLeft === 0) {
      this.status = "won";
      this.score += timeBonus(this.level.par, this.elapsed);
    } else if (this.balls.length === 0) {
      this.status = "lost";
    }
  }

  // GameActions — implemented in the items task.
  multiplyBalls(_n: number): void { throw new Error("not implemented"); }
  addBalls(_n: number): void { throw new Error("not implemented"); }
  growPaddle(_steps: number): void { throw new Error("not implemented"); }
  setFire(_seconds: number): void { throw new Error("not implemented"); }

  protected onBrickBroken(_index: number): void {}

  private placeOnPaddle(): void {
    const n = this.balls.length;
    this.balls.forEach((b, i) => {
      b.x = this.paddle.x + ((i + 0.5) / n - 0.5) * this.paddle.w * 0.8;
      b.y = this.paddleY - BALL_RADIUS;
    });
  }

  /** Moves x then y (so diagonal corners are caught). Returns false when the ball fell out. */
  // ponytail: ball treated as its center point against cells; switch to swept circle if edges look wrong.
  private moveBall(b: Ball, dt: number): boolean {
    let reflected = false;
    const nx = b.x + b.vx * dt;
    if (nx < 0 || nx > this.width || this.hit(nx, b.y)) {
      b.vx = -b.vx;
      reflected = true;
    } else b.x = nx;

    const ny = b.y + b.vy * dt;
    const half = this.paddle.w / 2;
    if (ny < 0) {
      b.vy = -b.vy;
      reflected = true;
    } else if (b.vy > 0 && b.y < this.paddleY && ny >= this.paddleY && Math.abs(b.x - this.paddle.x) <= half) {
      const offset = (b.x - this.paddle.x) / half;
      b.vx = BALL_SPEED * Math.sin(offset * MAX_BOUNCE_DEG * DEG);
      b.vy = -BALL_SPEED * Math.cos(offset * MAX_BOUNCE_DEG * DEG);
      b.y = this.paddleY;
    } else if (this.hit(b.x, ny)) {
      b.vy = -b.vy;
      reflected = true;
    } else b.y = ny;

    if (reflected && Math.abs(b.vy) < MIN_VY_RATIO * BALL_SPEED) {
      b.vy = Math.sign(b.vy || -1) * MIN_VY_RATIO * BALL_SPEED;
      b.vx = Math.sign(b.vx || 1) * Math.sqrt(BALL_SPEED ** 2 - b.vy ** 2);
    }
    return b.y <= this.height;
  }

  /** True when the ball must reflect off the cell at (x, y). Breaks bricks. */
  private hit(x: number, y: number): boolean {
    const col = Math.floor(x / CELL);
    const row = Math.floor(y / CELL);
    const cell = cellAt(this.grid, col, row);
    if (cell === Cell.Wall) return true;
    if (cell !== Cell.Brick) return false;
    const index = row * this.grid.cols + col;
    this.grid.cells[index] = Cell.Empty;
    this.bricksLeft--;
    this.score += 10;
    this.brokenCells.push(index);
    this.onBrickBroken(index);
    return this.fireLeft <= 0;
  }
}
