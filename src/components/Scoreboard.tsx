import clsx from "clsx";
import type { BotStatus, RaceCompetitor, Ranking } from "../types";

interface Props {
  competitors: RaceCompetitor[];
  rankings: Ranking[] | null;
}

const STATUS_STYLES: Record<BotStatus, string> = {
  ready: "bg-ink-100 text-ink-700 border-ink-100",
  racing: "bg-emerald-50 text-emerald-700 border-emerald-100",
  finished: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-rose-50 text-rose-700 border-rose-100",
  stuck: "bg-ink-100 text-ink-500 border-ink-100",
  error: "bg-rose-50 text-rose-700 border-rose-200",
};

export function Scoreboard({ competitors, rankings }: Props) {
  const rankMap = new Map<string, Ranking>(
    (rankings ?? []).map((r) => [r.botId, r]),
  );

  // Sort: by rank if finalized, else by efficiency-ish proxy (finished first, then steps asc).
  const sorted = [...competitors].sort((a, b) => {
    const ra = rankMap.get(a.def.id)?.rank;
    const rb = rankMap.get(b.def.id)?.rank;
    if (ra !== undefined && rb !== undefined) return ra - rb;
    if (ra !== undefined) return -1;
    if (rb !== undefined) return 1;
    const aDone = a.state.status === "finished" ? 0 : 1;
    const bDone = b.state.status === "finished" ? 0 : 1;
    if (aDone !== bDone) return aDone - bDone;
    return a.state.metrics.steps - b.state.metrics.steps;
  });

  return (
    <div className="surface overflow-hidden">
      <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
        <h3 className="font-display font-semibold text-ink-900">
          Live scoreboard
        </h3>
        <span className="text-[11px] text-ink-500">
          {rankings ? "final rankings" : "ranks update on finish"}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-canvas-sunken text-ink-500 text-[11px] uppercase tracking-wider">
              <th className="px-3 py-2 text-left font-semibold w-10">#</th>
              <th className="px-3 py-2 text-left font-semibold">Bot</th>
              <th className="px-3 py-2 text-left font-semibold">Status</th>
              <th className="px-3 py-2 text-right font-semibold">Steps</th>
              <th className="px-3 py-2 text-right font-semibold">Cells</th>
              <th className="px-3 py-2 text-right font-semibold">D/E</th>
              <th className="px-3 py-2 text-right font-semibold">Back</th>
              <th className="px-3 py-2 text-right font-semibold">Loops</th>
              <th className="px-3 py-2 text-right font-semibold">ms</th>
              <th className="px-3 py-2 text-right font-semibold">Eff.</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => {
              const rank = rankMap.get(c.def.id);
              return (
                <tr
                  key={c.def.id}
                  className="border-t border-ink-100 hover:bg-canvas-sunken/40"
                >
                  <td className="px-3 py-2 font-mono text-ink-500">
                    {rank?.rank ?? i + 1}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: c.def.color }}
                      />
                      <span className="font-semibold text-ink-900">
                        {c.def.name}
                      </span>
                      <span className="text-base leading-none">
                        {c.def.emoji}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={clsx(
                        "pill border",
                        STATUS_STYLES[c.state.status],
                      )}
                    >
                      {c.state.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {c.state.metrics.steps}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {c.state.metrics.cellsExplored}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {c.state.metrics.deadEnds}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {c.state.metrics.backtracks}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {c.state.metrics.loops}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-ink-500">
                    {c.state.metrics.runtimeMs.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-brand-700">
                    {rank?.efficiency ?? "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
