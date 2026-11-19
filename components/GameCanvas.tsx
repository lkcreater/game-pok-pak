"use client";

import { useEffect, useRef, useState } from "react";
import { BALL_RADIUS, CELL, DROP_RADIUS, FIXED_DT, PADDLE_H } from "@/lib/game/constants";
import { Game, type Status } from "@/lib/game/engine";
import { Cell } from "@/lib/game/grid";
import { ITEMS } from "@/lib/game/items";
import type { Level } from "@/lib/game/levels";

type Props = {
  level: Level;
  playerName: string;
  onEnd(r: { won: boolean; score: number }): void;
  onQuit(): void;
};

const COLORS = { bg: "#111", brick: "#f5d90a", wall: "#8a8a8a", ball: "#fff", fire: "#ff9d3c", paddle: "#e0413a" };
const KEY_SPEED = 600; // px/s

export default function GameCanvas({ level, playerName, onEnd, onQuit }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(false);
  const onEndRef = useRef(onEnd);
  const [paused, setPausedState] = useState(false);
  const [hud, setHud] = useState({ score: 0, time: 0, balls: level.balls, status: "ready" as Status });

  useEffect(() => {
    onEndRef.current = onEnd;
  });

  const setPaused = (p: boolean) => {
    pausedRef.current = p;
    setPausedState(p);
  };

  useEffect(() => {
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const game = new Game(level);
    if (process.env.NODE_ENV !== "production") (window as unknown as { __game?: Game }).__game = game; // dev-only handle for automated checks
    const off = document.createElement("canvas");
    const offCtx = off.getContext("2d")!;
    let scale = 1; // CSS px per world px
    let k = 1; // device px per world px

    const drawCell = (index: number) => {
      const col = index % game.grid.cols;
      const row = Math.floor(index / game.grid.cols);
      const x = col * CELL * k;
      const y = row * CELL * k;
      const size = CELL * k;
      offCtx.clearRect(x, y, size, size);
      const cell = game.grid.cells[index];
      if (cell === Cell.Empty) return;
      offCtx.fillStyle = cell === Cell.Wall ? COLORS.wall : COLORS.brick;
      const gap = Math.max(1, k);
      offCtx.fillRect(x, y, size - gap, size - gap);
    };

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      scale = Math.min(r.width / game.width, r.height / game.height);
      const dpr = window.devicePixelRatio || 1;
      k = scale * dpr;
      canvas.style.width = `${game.width * scale}px`;
      canvas.style.height = `${game.height * scale}px`;
      canvas.width = off.width = Math.round(game.width * k);
      canvas.height = off.height = Math.round(game.height * k);
      offCtx.clearRect(0, 0, off.width, off.height);
      for (let i = 0; i < game.grid.cells.length; i++) drawCell(i);
    };

    const draw = () => {
      for (const i of game.brokenCells) drawCell(i);
      game.brokenCells.length = 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(off, 0, 0);
      ctx.setTransform(k, 0, 0, k, 0, 0);

      ctx.fillStyle = game.fireLeft > 0 ? COLORS.fire : COLORS.ball;
      ctx.beginPath();
      for (const b of game.balls) {
        ctx.moveTo(b.x + BALL_RADIUS, b.y);
        ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2);
      }
      ctx.fill();

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 8px system-ui, sans-serif";
      for (const d of game.drops) {
        const item = ITEMS[d.item];
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(d.x, d.y, DROP_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillText(item.label, d.x, d.y + 0.5);
      }

      ctx.fillStyle = COLORS.paddle;
      ctx.fillRect(game.paddle.x - game.paddle.w / 2, game.paddleY, game.paddle.w, PADDLE_H);
    };

    const toWorldX = (clientX: number) => (clientX - canvas.getBoundingClientRect().left) / scale;
    const onPointerMove = (e: PointerEvent) => game.setPaddleX(toWorldX(e.clientX));
    const onPointerDown = (e: PointerEvent) => {
      if (pausedRef.current) return setPaused(false);
      game.setPaddleX(toWorldX(e.clientX));
      game.launch();
    };
    const keys = { left: false, right: false };
    const onKey = (e: KeyboardEvent) => {
      const down = e.type === "keydown";
      if (e.key === "ArrowLeft") keys.left = down;
      else if (e.key === "ArrowRight") keys.right = down;
      else if (down && e.key === " ") {
        e.preventDefault();
        game.launch();
      } else if (down && (e.key === "Escape" || e.key.toLowerCase() === "p")) setPaused(!pausedRef.current);
    };
    const onVisibility = () => document.hidden && setPaused(true);

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let ended = false;
    const frame = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.1); // clamp: backgrounded tab / debugger pause
      last = t;
      if (!pausedRef.current) {
        const dir = Number(keys.right) - Number(keys.left);
        if (dir) game.setPaddleX(game.paddle.x + dir * KEY_SPEED * dt);
        acc += dt;
        while (acc >= FIXED_DT) {
          game.step();
          acc -= FIXED_DT;
        }
      }
      draw();
      if (!ended && (game.status === "won" || game.status === "lost")) {
        ended = true;
        onEndRef.current({ won: game.status === "won", score: game.score });
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const hudTimer = setInterval(
      () => setHud({ score: game.score, time: game.elapsed, balls: game.balls.length, status: game.status }),
      100,
    );
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    resize();
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(hudTimer);
      observer.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [level]);

  return (
    <div className="game">
      <div className="hud">
        <span className="hud-name">{playerName}</span>
        <span>{level.name}</span>
        <span>คะแนน {hud.score.toLocaleString()}</span>
        <span>{hud.time.toFixed(1)} วิ</span>
        <span>ลูก {hud.balls}</span>
        <button onClick={() => setPaused(!paused)} aria-label={paused ? "เล่นต่อ" : "หยุดชั่วคราว"}>
          {paused ? "▶" : "⏸"}
        </button>
        <button onClick={onQuit}>ออก</button>
      </div>
      <div className="stage" ref={wrapRef}>
        <canvas ref={canvasRef} />
        {paused && <div className="overlay">หยุดชั่วคราว — แตะหรือกด Esc เพื่อเล่นต่อ</div>}
        {!paused && hud.status === "ready" && <div className="overlay hint">แตะ / คลิก / Space เพื่อยิงลูก</div>}
      </div>
    </div>
  );
}
