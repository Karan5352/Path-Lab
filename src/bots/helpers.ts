// Shared utilities for bot strategies: path search, neighbor inspection, etc.

import {
  type CellKind,
  type Coord,
  type Direction,
  type Maze,
  DELTAS,
  DIRECTIONS,
  coordKey,
  OPPOSITE,
} from "../types";

export function inBounds(maze: Maze, x: number, y: number): boolean {
  return x >= 0 && x < maze.width && y >= 0 && y < maze.height;
}

export function isWalkable(kind: CellKind | undefined): boolean {
  return kind !== undefined && kind !== "wall";
}

export function cellAt(maze: Maze, x: number, y: number): CellKind | undefined {
  if (!inBounds(maze, x, y)) return undefined;
  return maze.cells[y][x];
}

export function step(c: Coord, dir: Direction): Coord {
  const { dx, dy } = DELTAS[dir];
  return { x: c.x + dx, y: c.y + dy };
}

export function manhattan(a: Coord, b: Coord): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Build a list of walkable neighbors with their direction from a coord, given
 * a function that reports each cell's kind. The function returns `undefined`
 * for unknown (fog) or out-of-bounds cells.
 */
export function neighborsOf(
  c: Coord,
  reveal: (x: number, y: number) => CellKind | undefined,
): { dir: Direction; coord: Coord; kind: CellKind }[] {
  const out: { dir: Direction; coord: Coord; kind: CellKind }[] = [];
  for (const dir of DIRECTIONS) {
    const n = step(c, dir);
    const k = reveal(n.x, n.y);
    if (isWalkable(k)) out.push({ dir, coord: n, kind: k as CellKind });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Global path search (omniscient mode)
// ---------------------------------------------------------------------------

export interface SearchResult {
  path: Direction[];
  explored: number;
}

export function bfsPath(maze: Maze, start: Coord, goal: Coord): SearchResult {
  const seen = new Set<string>([coordKey(start)]);
  const parent = new Map<string, { from: string; dir: Direction }>();
  const queue: Coord[] = [start];
  let explored = 0;

  while (queue.length) {
    const cur = queue.shift()!;
    explored++;
    if (cur.x === goal.x && cur.y === goal.y) {
      return { path: reconstruct(parent, goal), explored };
    }
    for (const dir of DIRECTIONS) {
      const n = step(cur, dir);
      const k = cellAt(maze, n.x, n.y);
      const nk = coordKey(n);
      if (!isWalkable(k) || seen.has(nk)) continue;
      seen.add(nk);
      parent.set(nk, { from: coordKey(cur), dir });
      queue.push(n);
    }
  }
  return { path: [], explored };
}

export function dfsPath(maze: Maze, start: Coord, goal: Coord): SearchResult {
  const seen = new Set<string>([coordKey(start)]);
  const parent = new Map<string, { from: string; dir: Direction }>();
  const stack: Coord[] = [start];
  let explored = 0;

  while (stack.length) {
    const cur = stack.pop()!;
    explored++;
    if (cur.x === goal.x && cur.y === goal.y) {
      return { path: reconstruct(parent, goal), explored };
    }
    for (const dir of DIRECTIONS) {
      const n = step(cur, dir);
      const k = cellAt(maze, n.x, n.y);
      const nk = coordKey(n);
      if (!isWalkable(k) || seen.has(nk)) continue;
      seen.add(nk);
      parent.set(nk, { from: coordKey(cur), dir });
      stack.push(n);
    }
  }
  return { path: [], explored };
}

export function astarPath(maze: Maze, start: Coord, goal: Coord): SearchResult {
  // Simple binary-heap-less A* using a sorted insertion (fine for our maze sizes).
  type Node = { c: Coord; g: number; f: number };
  const open: Node[] = [{ c: start, g: 0, f: manhattan(start, goal) }];
  const gScore = new Map<string, number>([[coordKey(start), 0]]);
  const parent = new Map<string, { from: string; dir: Direction }>();
  let explored = 0;

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift()!;
    explored++;
    if (cur.c.x === goal.x && cur.c.y === goal.y) {
      return { path: reconstruct(parent, goal), explored };
    }
    for (const dir of DIRECTIONS) {
      const n = step(cur.c, dir);
      const k = cellAt(maze, n.x, n.y);
      if (!isWalkable(k)) continue;
      const tentative = cur.g + 1;
      const nk = coordKey(n);
      if (tentative < (gScore.get(nk) ?? Infinity)) {
        gScore.set(nk, tentative);
        parent.set(nk, { from: coordKey(cur.c), dir });
        open.push({ c: n, g: tentative, f: tentative + manhattan(n, goal) });
      }
    }
  }
  return { path: [], explored };
}

export function greedyPath(maze: Maze, start: Coord, goal: Coord): SearchResult {
  // Greedy best-first search: always expand the open node with lowest heuristic.
  type Node = { c: Coord; h: number };
  const open: Node[] = [{ c: start, h: manhattan(start, goal) }];
  const seen = new Set<string>([coordKey(start)]);
  const parent = new Map<string, { from: string; dir: Direction }>();
  let explored = 0;

  while (open.length) {
    open.sort((a, b) => a.h - b.h);
    const cur = open.shift()!;
    explored++;
    if (cur.c.x === goal.x && cur.c.y === goal.y) {
      return { path: reconstruct(parent, goal), explored };
    }
    for (const dir of DIRECTIONS) {
      const n = step(cur.c, dir);
      const k = cellAt(maze, n.x, n.y);
      const nk = coordKey(n);
      if (!isWalkable(k) || seen.has(nk)) continue;
      seen.add(nk);
      parent.set(nk, { from: coordKey(cur.c), dir });
      open.push({ c: n, h: manhattan(n, goal) });
    }
  }
  return { path: [], explored };
}

function reconstruct(
  parent: Map<string, { from: string; dir: Direction }>,
  goal: Coord,
): Direction[] {
  const out: Direction[] = [];
  let k = coordKey(goal);
  while (parent.has(k)) {
    const step = parent.get(k)!;
    out.push(step.dir);
    k = step.from;
  }
  return out.reverse();
}

// ---------------------------------------------------------------------------
// Local search inside a known subgraph (fog-of-war mode)
// ---------------------------------------------------------------------------

/**
 * BFS over the set of cells the bot has already discovered. Returns the first
 * direction to step toward `predicate`-matching target. `walls` is a set of
 * known wall coord keys; cells not in walls and not in `discovered` are
 * treated as "unknown"; if `crossUnknown` is true, BFS may traverse them.
 */
export function bfsInKnown(
  start: Coord,
  discovered: Map<string, CellKind>,
  isTarget: (c: Coord) => boolean,
): Direction[] {
  const seen = new Set<string>([coordKey(start)]);
  const parent = new Map<string, { from: string; dir: Direction }>();
  const queue: Coord[] = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    if (isTarget(cur)) {
      const out: Direction[] = [];
      let k = coordKey(cur);
      while (parent.has(k)) {
        const s = parent.get(k)!;
        out.push(s.dir);
        k = s.from;
      }
      return out.reverse();
    }
    for (const dir of DIRECTIONS) {
      const n = step(cur, dir);
      const nk = coordKey(n);
      if (seen.has(nk)) continue;
      const k = discovered.get(nk);
      if (k === undefined || k === "wall") continue;
      seen.add(nk);
      parent.set(nk, { from: coordKey(cur), dir });
      queue.push(n);
    }
  }
  return [];
}

/**
 * BFS over the discovered subgraph from `start`. For every cell matching
 * `predicate`, compute `scorer(cell, pathLength)` and remember the lowest
 * score. Returns the directions path to the best-scoring cell, or an empty
 * array if none match. Use this when a bot wants to pick a frontier by a
 * combination of "how far is it from me" and "how good is it" (e.g., A*-style
 * frontier selection in fog mode).
 */
export function bfsPickBest(
  start: Coord,
  discovered: Map<string, CellKind>,
  predicate: (c: Coord) => boolean,
  scorer: (c: Coord, pathLen: number) => number,
): Direction[] {
  const seen = new Set<string>([coordKey(start)]);
  const parent = new Map<string, { from: string; dir: Direction }>();
  const dist = new Map<string, number>([[coordKey(start), 0]]);
  const queue: Coord[] = [start];
  let bestKey: string | null = null;
  let bestScore = Infinity;

  while (queue.length) {
    const cur = queue.shift()!;
    const ck = coordKey(cur);
    const cd = dist.get(ck)!;
    if (predicate(cur)) {
      const s = scorer(cur, cd);
      if (s < bestScore) {
        bestScore = s;
        bestKey = ck;
      }
    }
    for (const dir of DIRECTIONS) {
      const n = step(cur, dir);
      const nk = coordKey(n);
      if (seen.has(nk)) continue;
      const k = discovered.get(nk);
      if (k === undefined || k === "wall") continue;
      seen.add(nk);
      parent.set(nk, { from: ck, dir });
      dist.set(nk, cd + 1);
      queue.push(n);
    }
  }

  if (bestKey === null) return [];
  const out: Direction[] = [];
  let k = bestKey;
  while (parent.has(k)) {
    const s = parent.get(k)!;
    out.push(s.dir);
    k = s.from;
  }
  return out.reverse();
}

// Look at the directions from a coord through a "reveal" function and return
// directions whose target is open (walkable).
export function openDirsFrom(
  c: Coord,
  reveal: (x: number, y: number) => CellKind | undefined,
): Direction[] {
  return DIRECTIONS.filter((d) => {
    const n = step(c, d);
    return isWalkable(reveal(n.x, n.y));
  });
}

export { OPPOSITE };
