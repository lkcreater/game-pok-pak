export const Cell = { Empty: 0, Wall: 1, Brick: 2 } as const;
export type Cell = (typeof Cell)[keyof typeof Cell];

export type Grid = { cols: number; rows: number; cells: Uint8Array }; // row-major

const LEGEND: Record<string, Cell> = { ".": Cell.Empty, "#": Cell.Wall, B: Cell.Brick };

export function parseMap(map: string[]): Grid {
  const cols = map[0]?.length ?? 0;
  const cells = new Uint8Array(cols * map.length);
  map.forEach((row, r) => {
    if (row.length !== cols) throw new Error(`row ${r} has length ${row.length}, expected ${cols}`);
    [...row].forEach((ch, c) => {
      const cell = LEGEND[ch];
      if (cell === undefined) throw new Error(`unknown map char "${ch}" at row ${r} col ${c}`);
      cells[r * cols + c] = cell;
    });
  });
  return { cols, rows: map.length, cells };
}

export function cellAt(g: Grid, col: number, row: number): Cell {
  if (col < 0 || row < 0 || col >= g.cols || row >= g.rows) return Cell.Empty;
  return g.cells[row * g.cols + col] as Cell;
}
