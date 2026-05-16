import type { Maze, RaceCompetitor, RacePhase } from "../types";

interface Props {
  maze: Maze;
  competitors: RaceCompetitor[];
  phase: RacePhase;
  cellSize?: number;
}

export function MazeCanvas({
  maze,
  competitors,
  phase,
  cellSize = 22,
}: Props) {
  const w = maze.width * cellSize;
  const h = maze.height * cellSize;

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft arena-bg p-3 md:p-4">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        className="block w-full h-auto"
        style={{ maxHeight: "min(72vh, 720px)" }}
      >
        <defs>
          <radialGradient id="goalGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#FCD34D" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#FCD34D" stopOpacity="0" />
          </radialGradient>
          <filter id="botShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow
              dx="0"
              dy="1.5"
              stdDeviation="1.2"
              floodColor="#0B0F1A"
              floodOpacity="0.25"
            />
          </filter>
        </defs>

        {/* Cells */}
        {maze.cells.flatMap((row, y) =>
          row.map((kind, x) => {
            const key = `${x},${y}`;
            const px = x * cellSize;
            const py = y * cellSize;
            if (kind === "wall") {
              return (
                <rect
                  key={key}
                  x={px}
                  y={py}
                  width={cellSize}
                  height={cellSize}
                  rx={2}
                  ry={2}
                  fill="#5A33E0"
                />
              );
            }
            if (kind === "start") {
              return (
                <g key={key}>
                  <rect
                    x={px}
                    y={py}
                    width={cellSize}
                    height={cellSize}
                    fill="#FFFFFF"
                  />
                  <circle
                    cx={px + cellSize / 2}
                    cy={py + cellSize / 2}
                    r={cellSize / 3.2}
                    fill="#10B981"
                  />
                  <circle
                    cx={px + cellSize / 2}
                    cy={py + cellSize / 2}
                    r={cellSize / 6}
                    fill="#FFFFFF"
                  />
                </g>
              );
            }
            if (kind === "goal") {
              return (
                <g key={key}>
                  <rect
                    x={px}
                    y={py}
                    width={cellSize}
                    height={cellSize}
                    fill="#FFF6E0"
                  />
                  <circle
                    cx={px + cellSize / 2}
                    cy={py + cellSize / 2}
                    r={cellSize}
                    fill="url(#goalGlow)"
                  />
                  <text
                    x={px + cellSize / 2}
                    y={py + cellSize / 2 + cellSize * 0.18}
                    textAnchor="middle"
                    fontSize={cellSize * 0.7}
                  >
                    🏁
                  </text>
                </g>
              );
            }
            // 'open'
            return (
              <rect
                key={key}
                x={px}
                y={py}
                width={cellSize}
                height={cellSize}
                fill="#FFFFFF"
              />
            );
          }),
        )}

        {/* Bot trails */}
        {competitors.map((c, idx) => {
          const color = c.def.color;
          const offset = trailOffset(idx, competitors.length, cellSize);
          // Skip the very last position (where the bot is drawn).
          const trail = c.state.trail.slice(0, -1);
          return (
            <g key={`trail-${c.def.id}`} opacity={0.7}>
              {trail.map((p, i) => (
                <rect
                  key={`${c.def.id}-trail-${i}`}
                  x={p.x * cellSize + offset.x}
                  y={p.y * cellSize + offset.y}
                  width={cellSize * 0.32}
                  height={cellSize * 0.32}
                  rx={cellSize * 0.1}
                  fill={color}
                  fillOpacity={0.35}
                />
              ))}
            </g>
          );
        })}

        {/* Bots */}
        {competitors.map((c) => {
          const { x, y } = c.state.position;
          const cx = x * cellSize + cellSize / 2;
          const cy = y * cellSize + cellSize / 2;
          const r = cellSize / 2.6;
          const stuckish =
            c.state.status === "stuck" ||
            c.state.status === "failed" ||
            c.state.status === "error";
          const finished = c.state.status === "finished";
          return (
            <g
              key={`bot-${c.def.id}`}
              style={{
                transform: `translate(${cx}px, ${cy}px)`,
                transition:
                  phase === "running"
                    ? "transform 90ms linear"
                    : "transform 180ms ease-out",
              }}
            >
              <circle
                r={r + 1.2}
                fill="#FFFFFF"
                opacity={0.95}
                filter="url(#botShadow)"
              />
              <circle
                r={r}
                fill={c.def.color}
                opacity={stuckish ? 0.55 : 1}
              />
              {finished && (
                <circle
                  r={r + 4}
                  fill="none"
                  stroke={c.def.color}
                  strokeWidth={1.5}
                  opacity={0.6}
                />
              )}
              <text
                textAnchor="middle"
                dy={r * 0.4}
                fontSize={r * 1.1}
                pointerEvents="none"
              >
                {c.def.emoji}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Small per-bot offset so overlapping trails don't fully obscure each other.
function trailOffset(idx: number, total: number, cellSize: number) {
  if (total <= 1) {
    const c = (cellSize - cellSize * 0.32) / 2;
    return { x: c, y: c };
  }
  const cols = Math.ceil(Math.sqrt(total));
  const row = Math.floor(idx / cols);
  const col = idx % cols;
  const pad = cellSize * 0.08;
  const innerW = (cellSize - pad * 2) / cols;
  return {
    x: pad + col * innerW + innerW * 0.5 - cellSize * 0.16,
    y: pad + row * innerW + innerW * 0.5 - cellSize * 0.16,
  };
}
