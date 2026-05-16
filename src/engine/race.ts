import {
  type BotDefinition,
  type BotRuntimeState,
  type CellKind,
  type ChooseMoveContext,
  type Coord,
  type Direction,
  type Maze,
  type RaceCompetitor,
  type RaceConfig,
  type RaceSnapshot,
  type Ranking,
  type VisionMode,
  coordKey,
  DELTAS,
  DIRECTIONS,
} from "../types";

const DEFAULT_TICK_MS = 110;
const DEFAULT_MOVE_LIMIT = 4000;
const MAX_CONSECUTIVE_BUMPS = 8;

function cloneCoord(c: Coord): Coord {
  return { x: c.x, y: c.y };
}

function initialBotState(start: Coord): BotRuntimeState {
  return {
    position: cloneCoord(start),
    trail: [cloneCoord(start)],
    visitCount: new Map([[coordKey(start), 1]]),
    discovered: new Map<string, CellKind>(),
    memory: {},
    status: "ready",
    metrics: {
      steps: 0,
      cellsExplored: 1,
      deadEnds: 0,
      backtracks: 0,
      loops: 0,
      runtimeMs: 0,
    },
  };
}

function revealAround(
  maze: Maze,
  c: Coord,
  discovered: Map<string, CellKind>,
): void {
  // Reveal the current cell and its 4 neighbors.
  const here = maze.cells[c.y]?.[c.x];
  if (here) discovered.set(coordKey(c), here);
  for (const d of DIRECTIONS) {
    const n = { x: c.x + DELTAS[d].dx, y: c.y + DELTAS[d].dy };
    if (n.x < 0 || n.y < 0 || n.x >= maze.width || n.y >= maze.height) continue;
    discovered.set(coordKey(n), maze.cells[n.y][n.x]);
  }
}

function countOpenNeighbors(maze: Maze, c: Coord): number {
  let n = 0;
  for (const d of DIRECTIONS) {
    const t = { x: c.x + DELTAS[d].dx, y: c.y + DELTAS[d].dy };
    if (t.x < 0 || t.y < 0 || t.x >= maze.width || t.y >= maze.height) continue;
    if (maze.cells[t.y][t.x] !== "wall") n++;
  }
  return n;
}

export class RaceController {
  private snapshot: RaceSnapshot;
  private timer: number | null = null;
  private tickMs: number = DEFAULT_TICK_MS;
  private listeners = new Set<(s: RaceSnapshot) => void>();
  private bumpsByBot = new Map<string, number>();

  constructor(config: RaceConfig) {
    this.snapshot = {
      config,
      phase: "idle",
      tick: 0,
      competitors: config.bots.map((b) => this.spawnCompetitor(b, config)),
      rankings: null,
    };
  }

  private spawnCompetitor(b: BotDefinition, config: RaceConfig): RaceCompetitor {
    const state = initialBotState(config.maze.start);
    if (b.init) {
      try {
        state.memory = b.init(config.maze, config.maze.start, config.maze.goal, config.vision);
      } catch (err) {
        state.status = "error";
        state.errorMessage = (err as Error).message;
      }
    }
    if (config.vision === "explorer") {
      revealAround(config.maze, config.maze.start, state.discovered);
    } else {
      // Omniscient: discovered = full maze.
      for (let y = 0; y < config.maze.height; y++) {
        for (let x = 0; x < config.maze.width; x++) {
          state.discovered.set(`${x},${y}`, config.maze.cells[y][x]);
        }
      }
    }
    return { def: b, state };
  }

  subscribe(fn: (s: RaceSnapshot) => void): () => void {
    this.listeners.add(fn);
    fn(this.snapshot);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    // Build a new shallow snapshot ref to trigger React updates.
    this.snapshot = { ...this.snapshot };
    for (const fn of this.listeners) fn(this.snapshot);
  }

  setSpeed(stepsPerSec: number): void {
    this.tickMs = Math.max(15, Math.min(1000, Math.round(1000 / stepsPerSec)));
  }

  start(): void {
    if (this.snapshot.phase === "running") return;
    if (this.snapshot.phase === "finished") return;
    // Promote ready bots to racing.
    for (const c of this.snapshot.competitors) {
      if (c.state.status === "ready") c.state.status = "racing";
    }
    this.snapshot.phase = "running";
    this.emit();
    this.scheduleTick();
  }

  pause(): void {
    if (this.snapshot.phase !== "running") return;
    this.snapshot.phase = "paused";
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.emit();
  }

  resume(): void {
    if (this.snapshot.phase !== "paused") return;
    this.snapshot.phase = "running";
    this.emit();
    this.scheduleTick();
  }

  step(): void {
    if (this.snapshot.phase === "running") this.pause();
    // Allow stepping when idle (force-start ready bots).
    for (const c of this.snapshot.competitors) {
      if (c.state.status === "ready") c.state.status = "racing";
    }
    this.tickOnce();
    this.emit();
  }

  forceFinish(): void {
    // Promote every still-racing or ready bot to "failed" so the race can
    // finalize. Useful when one or more bots are stuck in an infinite loop.
    if (this.snapshot.phase === "finished") return;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    for (const c of this.snapshot.competitors) {
      if (c.state.status === "racing" || c.state.status === "ready") {
        c.state.status = "failed";
      }
    }
    this.finalize();
    this.emit();
  }

  reset(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.bumpsByBot.clear();
    this.snapshot = {
      config: this.snapshot.config,
      phase: "idle",
      tick: 0,
      competitors: this.snapshot.config.bots.map((b) =>
        this.spawnCompetitor(b, this.snapshot.config),
      ),
      rankings: null,
    };
    this.emit();
  }

  destroy(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.listeners.clear();
  }

  private scheduleTick(): void {
    this.timer = window.setTimeout(() => {
      this.tickOnce();
      this.emit();
      if (this.snapshot.phase === "running") this.scheduleTick();
    }, this.tickMs);
  }

  private tickOnce(): void {
    if (this.snapshot.phase === "finished") return;
    this.snapshot.tick++;
    const { maze, vision, moveLimit } = this.snapshot.config;
    const limit = moveLimit ?? DEFAULT_MOVE_LIMIT;
    let anyActive = false;

    for (const c of this.snapshot.competitors) {
      const state = c.state;
      if (state.status !== "racing") continue;
      anyActive = true;

      const ctx = this.buildContext(c, maze, vision);
      const t0 = performance.now();
      let dir: Direction | null = null;
      try {
        dir = c.def.chooseMove(ctx) ?? null;
      } catch (err) {
        state.status = "error";
        state.errorMessage = (err as Error).message;
        continue;
      }
      const t1 = performance.now();
      state.metrics.runtimeMs += t1 - t0;

      if (dir === null) {
        state.status = "stuck";
        continue;
      }
      if (!DIRECTIONS.includes(dir)) {
        state.status = "error";
        state.errorMessage = `Bot returned invalid direction: ${String(dir)}`;
        continue;
      }

      const { dx, dy } = DELTAS[dir];
      const target: Coord = { x: state.position.x + dx, y: state.position.y + dy };
      const inBounds =
        target.x >= 0 &&
        target.y >= 0 &&
        target.x < maze.width &&
        target.y < maze.height;
      const kind = inBounds ? maze.cells[target.y][target.x] : "wall";
      state.metrics.steps++;
      (state.memory as Record<string, unknown>)["lastDirection"] = dir;

      if (!inBounds || kind === "wall") {
        // Wall bump. Count and possibly mark stuck.
        const bumps = (this.bumpsByBot.get(c.def.id) ?? 0) + 1;
        this.bumpsByBot.set(c.def.id, bumps);
        if (bumps >= MAX_CONSECUTIVE_BUMPS) {
          state.status = "stuck";
        }
      } else {
        // Valid move.
        this.bumpsByBot.set(c.def.id, 0);
        const fromKey = coordKey(state.position);
        const toKey = coordKey(target);
        const prevTrailLen = state.trail.length;
        const previousVisits = state.visitCount.get(toKey) ?? 0;

        // Detect backtrack (entering the cell we were on the step before).
        if (state.trail.length >= 2) {
          const prior = state.trail[state.trail.length - 2];
          if (prior.x === target.x && prior.y === target.y) {
            state.metrics.backtracks++;
          }
        }
        // Detect loop (revisiting a cell; only count once per cell).
        if (previousVisits === 1) state.metrics.loops++;

        state.position = target;
        state.trail.push(cloneCoord(target));
        state.visitCount.set(toKey, previousVisits + 1);
        if (vision === "explorer") {
          revealAround(maze, target, state.discovered);
        }
        if (previousVisits === 0) state.metrics.cellsExplored++;

        // Detect dead end: a cell with only one walkable neighbor (and we're
        // entering it from that one neighbor).
        if (countOpenNeighbors(maze, target) === 1 && previousVisits === 0) {
          state.metrics.deadEnds++;
        }

        if (target.x === maze.goal.x && target.y === maze.goal.y) {
          state.status = "finished";
        } else if (state.metrics.steps >= limit) {
          state.status = "failed";
        }

        // Silence unused warnings for variables only used in branches.
        void fromKey;
        void prevTrailLen;
      }
    }

    // Force-fail any racing bot over the move limit.
    for (const c of this.snapshot.competitors) {
      if (c.state.status === "racing" && c.state.metrics.steps >= limit) {
        c.state.status = "failed";
      }
    }

    const stillRacing = this.snapshot.competitors.some(
      (c) => c.state.status === "racing",
    );
    if (!stillRacing && anyActive) {
      // No more racing bots. Finish.
      this.finalize();
    } else if (!anyActive) {
      this.finalize();
    }
  }

  private finalize(): void {
    this.snapshot.phase = "finished";
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.snapshot.rankings = computeRankings(this.snapshot.competitors);
  }

  private buildContext(
    c: RaceCompetitor,
    maze: Maze,
    vision: VisionMode,
  ): ChooseMoveContext {
    const state = c.state;
    const neighbors: Partial<Record<Direction, CellKind>> = {};
    for (const d of DIRECTIONS) {
      const { dx, dy } = DELTAS[d];
      const x = state.position.x + dx;
      const y = state.position.y + dy;
      if (vision === "omniscient") {
        if (x < 0 || y < 0 || x >= maze.width || y >= maze.height) continue;
        neighbors[d] = maze.cells[y][x];
      } else {
        const k = state.discovered.get(`${x},${y}`);
        if (k !== undefined) neighbors[d] = k;
      }
    }
    const visited = new Set<string>(state.visitCount.keys());
    return {
      current: { ...state.position },
      goal: { ...maze.goal },
      neighbors,
      visited,
      visitCount: state.visitCount,
      trail: state.trail.slice(),
      maze: vision === "omniscient" ? maze : null,
      discovered: state.discovered,
      mode: vision,
      memory: state.memory,
      steps: state.metrics.steps,
      lastDirection:
        (state.memory as Record<string, unknown>).lastDirection as Direction ?? null,
    };
  }
}

// ---------------------------------------------------------------------------
// Scoring + rankings
// ---------------------------------------------------------------------------

export function efficiencyScore(c: RaceCompetitor, mazeOptimalSteps: number): number {
  // 100 points for an optimal run; subtract for waste.
  const s = c.state;
  if (s.status !== "finished") {
    // Partial credit for distance covered.
    const explored = s.metrics.cellsExplored;
    return Math.max(0, Math.round(20 * (explored / 50)));
  }
  const base = 100 * (mazeOptimalSteps / Math.max(mazeOptimalSteps, s.metrics.steps));
  const waste = (s.metrics.cellsExplored - mazeOptimalSteps) * 0.4;
  const penalties =
    s.metrics.loops * 0.5 +
    s.metrics.backtracks * 0.25 +
    s.metrics.deadEnds * 0.75;
  return Math.max(0, Math.round(base - waste - penalties));
}

export function computeRankings(comp: RaceCompetitor[]): Ranking[] {
  // Approximate optimal steps as the minimum steps among finishers; if none, use
  // a reasonable default. (The MazeCanvas's caller can pass a real value if it
  // wants.)
  const finishedSteps = comp
    .filter((c) => c.state.status === "finished")
    .map((c) => c.state.metrics.steps);
  const optimal = finishedSteps.length ? Math.min(...finishedSteps) : 1;
  const scored = comp.map((c) => ({
    botId: c.def.id,
    finished: c.state.status === "finished",
    efficiency: efficiencyScore(c, optimal),
    steps: c.state.metrics.steps,
    explored: c.state.metrics.cellsExplored,
    penalties:
      c.state.metrics.loops * 0.5 +
      c.state.metrics.backtracks * 0.25 +
      c.state.metrics.deadEnds * 0.75,
    runtime: c.state.metrics.runtimeMs,
  }));
  scored.sort((a, b) => {
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    if (b.efficiency !== a.efficiency) return b.efficiency - a.efficiency;
    if (a.steps !== b.steps) return a.steps - b.steps;
    if (a.explored !== b.explored) return a.explored - b.explored;
    if (a.penalties !== b.penalties) return a.penalties - b.penalties;
    return a.runtime - b.runtime;
  });
  return scored.map((s, i) => ({
    botId: s.botId,
    rank: i + 1,
    efficiency: s.efficiency,
    finished: s.finished,
  }));
}

export const DEFAULTS = {
  TICK_MS: DEFAULT_TICK_MS,
  MOVE_LIMIT: DEFAULT_MOVE_LIMIT,
};
