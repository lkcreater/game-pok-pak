"use client";

import { useState } from "react";
import GameCanvas from "./GameCanvas";
import { LEVELS } from "@/lib/game/levels";
import { starsFor } from "@/lib/game/scoring";
import { randomName } from "@/lib/names";
import { isUnlocked, loadSave, recordResult, writeSave, type SaveData } from "@/lib/save";

type Screen =
  | { k: "name" }
  | { k: "select" }
  | { k: "play"; index: number; attempt: number }
  | { k: "result"; index: number; attempt: number; won: boolean; score: number; stars: number };

const starText = (n: number) => "★".repeat(n) + "☆".repeat(3 - n);

export default function App() {
  const [save, setSave] = useState<SaveData>(loadSave);
  const [screen, setScreen] = useState<Screen>(() => (save.name ? { k: "select" } : { k: "name" }));
  const [nameInput, setNameInput] = useState(() => save.name || randomName());

  const commit = (s: SaveData) => {
    writeSave(s);
    setSave(s);
  };

  if (screen.k === "name") {
    const name = nameInput.trim();
    return (
      <main className="screen">
        <h1>Pok Pak</h1>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name) return;
            commit({ ...save, name });
            setScreen({ k: "select" });
          }}
        >
          <label htmlFor="name">ชื่อผู้เล่น</label>
          <div className="row">
            <input id="name" value={nameInput} maxLength={20} onChange={(e) => setNameInput(e.target.value)} autoFocus />
            <button type="button" onClick={() => setNameInput(randomName())} aria-label="สุ่มชื่อใหม่">🎲</button>
          </div>
          <button type="submit" className="primary" disabled={!name}>เริ่ม</button>
        </form>
      </main>
    );
  }

  if (screen.k === "select") {
    return (
      <main className="screen">
        <h1>Pok Pak</h1>
        <p>
          สวัสดี <b>{save.name}</b>{" "}
          <button className="link" onClick={() => setScreen({ k: "name" })}>เปลี่ยนชื่อ</button>
        </p>
        <div className="levels">
          {LEVELS.map((l, i) => {
            const rec = save.levels[l.id];
            const open = isUnlocked(save, LEVELS, i);
            return (
              <button key={l.id} className="level" disabled={!open} onClick={() => setScreen({ k: "play", index: i, attempt: 0 })}>
                <span className="level-num">{i + 1}</span>
                <span>{l.name}</span>
                <span className="stars">{open ? starText(rec?.stars ?? 0) : "🔒"}</span>
                <span className="best">{rec ? `Best ${rec.best.toLocaleString()}` : " "}</span>
              </button>
            );
          })}
        </div>
      </main>
    );
  }

  const level = LEVELS[screen.index];

  if (screen.k === "play") {
    return (
      <GameCanvas
        key={`${level.id}-${screen.attempt}`}
        level={level}
        playerName={save.name}
        onQuit={() => setScreen({ k: "select" })}
        onEnd={({ won, score }) => {
          const stars = starsFor(level, won, score);
          if (won) commit(recordResult(save, level.id, score, stars));
          setScreen({ ...screen, k: "result", won, score, stars });
        }}
      />
    );
  }

  const hasNext = screen.won && screen.index + 1 < LEVELS.length;
  return (
    <main className="screen">
      <h1>{screen.won ? `ด่าน ${screen.index + 1} ผ่าน!` : "ลูกหมดแล้ว"}</h1>
      <p className="stars big">{starText(screen.stars)}</p>
      <p>คะแนน {screen.score.toLocaleString()}</p>
      <p>Best {(save.levels[level.id]?.best ?? 0).toLocaleString()}</p>
      <div className="stack">
        {hasNext && (
          <button className="primary" onClick={() => setScreen({ k: "play", index: screen.index + 1, attempt: 0 })}>
            ด่านต่อไป
          </button>
        )}
        <button onClick={() => setScreen({ k: "play", index: screen.index, attempt: screen.attempt + 1 })}>เล่นซ้ำ</button>
        <button onClick={() => setScreen({ k: "select" })}>เลือกด่าน</button>
      </div>
    </main>
  );
}
