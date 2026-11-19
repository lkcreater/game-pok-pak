/** Commands the game exposes to items. A new item that needs new behaviour adds one method here. */
export type GameActions = {
  multiplyBalls(n: number): void;
  addBalls(n: number): void;
  growPaddle(steps: number): void;
  setFire(seconds: number): void;
};

export type ItemDef = { label: string; color: string; apply(g: GameActions): void };

/** Item registry — adding an item = adding one entry. */
export const ITEMS = {
  x2: { label: "×2", color: "#3fd0e0", apply: (g) => g.multiplyBalls(2) },
  x3: { label: "×3", color: "#28b4f0", apply: (g) => g.multiplyBalls(3) },
  up1: { label: "+1", color: "#c8e83a", apply: (g) => g.addBalls(1) },
  up3: { label: "+3", color: "#9be03a", apply: (g) => g.addBalls(3) },
  boardx1: { label: "<->", color: "#2fa84f", apply: (g) => g.growPaddle(1) },
  fire: { label: "🔥", color: "#e8504a", apply: (g) => g.setFire(8) },
} satisfies Record<string, ItemDef>;

export type ItemId = keyof typeof ITEMS;
