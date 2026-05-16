import { useSyncExternalStore } from "react";
import type { CellKind, Coord, Maze } from "../types";

const STORAGE_KEY = "pathlab.customMaze.v1";

export interface CustomMazeData {
  name: string;
  width: number;
  height: number;
  difficulty: Maze["difficulty"];
  // Encoded as a string of one char per cell: '#' wall, '.' open, 'S' start, 'G' goal.
  ascii: string;
}

interface State {
  data: CustomMazeData | null;
  maze: Maze | null;
  error: string | null;
}

function parseCustomMaze(d: CustomMazeData): { maze: Maze | null; error: string | null } {
  const rows = d.ascii.split("\n").filter((r) => r.length > 0);
  if (rows.length === 0) return { maze: null, error: "Empty maze." };
  const width = Math.max(...rows.map((r) => r.length));
  const height = rows.length;
  const cells: CellKind[][] = [];
  let start: Coord | null = null;
  let goal: Coord | null = null;
  for (let y = 0; y < height; y++) {
    const row: CellKind[] = [];
    const line = rows[y].padEnd(width, "#");
    for (let x = 0; x < width; x++) {
      const ch = line[x];
      if (ch === "#") row.push("wall");
      else if (ch === ".") row.push("open");
      else if (ch === "S") {
        row.push("start");
        start = { x, y };
      } else if (ch === "G") {
        row.push("goal");
        goal = { x, y };
      } else {
        return { maze: null, error: `Unknown char '${ch}' at (${x},${y}).` };
      }
    }
    cells.push(row);
  }
  if (!start) return { maze: null, error: "Missing start cell." };
  if (!goal) return { maze: null, error: "Missing goal cell." };
  // Solvability check.
  if (!hasPath(cells, start, goal, width, height)) {
    return { maze: null, error: "Start cannot reach goal." };
  }
  return {
    maze: {
      id: "custom",
      name: d.name.trim() || "Custom Maze",
      description: "Your custom maze.",
      difficulty: d.difficulty ?? "medium",
      width,
      height,
      start,
      goal,
      cells,
    },
    error: null,
  };
}

function hasPath(cells: CellKind[][], s: Coord, g: Coord, w: number, h: number): boolean {
  const seen = new Set<string>();
  const q: Coord[] = [s];
  while (q.length) {
    const c = q.shift()!;
    const k = `${c.x},${c.y}`;
    if (seen.has(k)) continue;
    seen.add(k);
    if (c.x === g.x && c.y === g.y) return true;
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const nx = c.x + dx;
      const ny = c.y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (cells[ny][nx] !== "wall") q.push({ x: nx, y: ny });
    }
  }
  return false;
}

function loadInitial(): State {
  if (typeof window === "undefined") return { data: null, maze: null, error: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { data: null, maze: null, error: null };
    const parsed = JSON.parse(raw) as Partial<CustomMazeData>;
    // Backward-compat: older saves had no difficulty field.
    const data: CustomMazeData = {
      name: parsed.name ?? "Custom Maze",
      width: parsed.width ?? 0,
      height: parsed.height ?? 0,
      difficulty: parsed.difficulty ?? "medium",
      ascii: parsed.ascii ?? "",
    };
    const { maze, error } = parseCustomMaze(data);
    return { data, maze, error };
  } catch {
    return { data: null, maze: null, error: null };
  }
}

let state: State = loadInitial();
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

export const customMazeStore = {
  get(): State {
    return state;
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  save(data: CustomMazeData): { ok: boolean; error?: string } {
    const { maze, error } = parseCustomMaze(data);
    if (!maze) {
      state = { data, maze: null, error };
      notify();
      return { ok: false, error: error ?? "Invalid maze." };
    }
    state = { data, maze, error: null };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
    notify();
    return { ok: true };
  },
  clear() {
    state = { data: null, maze: null, error: null };
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    notify();
  },
};

export function useCustomMaze(): State {
  return useSyncExternalStore(
    (cb) => customMazeStore.subscribe(cb),
    () => customMazeStore.get(),
    () => customMazeStore.get(),
  );
}
