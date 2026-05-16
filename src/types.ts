// Core type definitions for PathLab.

export type Direction = "up" | "down" | "left" | "right";

export const DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

export const DELTAS: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export type CellKind = "wall" | "open" | "start" | "goal";

export interface Coord {
  x: number;
  y: number;
}

export interface Maze {
  id: string;
  name: string;
  description: string;
  difficulty: "easy" | "medium" | "hard" | "boss";
  width: number;
  height: number;
  start: Coord;
  goal: Coord;
  cells: CellKind[][]; // cells[y][x]
}

export type BotStatus =
  | "ready"
  | "racing"
  | "finished"
  | "failed"
  | "stuck"
  | "error";

export type VisionMode = "omniscient" | "explorer";

export interface BotMetrics {
  steps: number;
  cellsExplored: number;
  deadEnds: number;
  backtracks: number;
  loops: number;
  runtimeMs: number;
}

export interface BotRuntimeState {
  position: Coord;
  trail: Coord[]; // ordered positions (includes start)
  visitCount: Map<string, number>; // key -> count
  discovered: Map<string, CellKind>; // for fog of war
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  memory: Record<string, any>;
  status: BotStatus;
  metrics: BotMetrics;
  errorMessage?: string;
}

export interface ChooseMoveContext {
  current: Coord;
  goal: Coord;
  neighbors: Partial<Record<Direction, CellKind>>;
  visited: Set<string>; // string "x,y" of previously visited cells
  visitCount: Map<string, number>;
  trail: Coord[];
  maze: Maze | null; // null in fog mode (full maze hidden)
  discovered: Map<string, CellKind>; // map of "x,y" -> kind, visible in either mode
  mode: VisionMode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  memory: Record<string, any>;
  steps: number;
  lastDirection: Direction | null;
}

export interface BotDefinition {
  id: string;
  name: string;
  emoji: string;
  color: string; // hex
  category: "planner" | "local" | "flawed" | "custom";
  description: string;
  tagline: string;
  worksWithFog: boolean; // some pure path-planning bots fall back gracefully in fog
  init?: (
    maze: Maze,
    start: Coord,
    goal: Coord,
    mode: VisionMode,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => Record<string, any>;
  chooseMove: (ctx: ChooseMoveContext) => Direction | null;
}

export interface RaceCompetitor {
  def: BotDefinition;
  state: BotRuntimeState;
}

export interface RaceConfig {
  maze: Maze;
  bots: BotDefinition[];
  vision: VisionMode;
  moveLimit: number;
}

export type RacePhase = "idle" | "running" | "paused" | "finished";

export interface RaceSnapshot {
  config: RaceConfig;
  phase: RacePhase;
  tick: number;
  competitors: RaceCompetitor[];
  rankings: Ranking[] | null;
}

export interface Ranking {
  botId: string;
  rank: number;
  efficiency: number;
  finished: boolean;
}

export const coordKey = (c: Coord) => `${c.x},${c.y}`;

export const parseCoordKey = (k: string): Coord => {
  const [x, y] = k.split(",").map(Number);
  return { x, y };
};
