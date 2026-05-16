import clsx from "clsx";
import { Trophy, RotateCcw, X } from "lucide-react";
import type { RaceCompetitor, Ranking } from "../types";

interface Props {
  competitors: RaceCompetitor[];
  rankings: Ranking[];
  onClose: () => void;
  onReset: () => void;
}

const MEDAL_BG = ["#FFDD8E", "#E2E5EE", "#F0BC92"];

export function Results({ competitors, rankings, onClose, onReset }: Props) {
  const byId = new Map(competitors.map((c) => [c.def.id, c]));
  const sorted = [...rankings].sort((a, b) => a.rank - b.rank);
  const finishers = sorted.filter((r) => r.finished);
  const winner = finishers[0];
  return (
    <div className="fixed inset-0 z-40 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="surface w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-pop-in">
        <div className="px-5 py-4 flex items-center justify-between border-b border-ink-100">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Trophy size={18} />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink-900">
                Race complete
              </h2>
              <p className="text-xs text-ink-500">
                {finishers.length} of {rankings.length} bots reached the goal.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost !px-2 !py-2">
            <X size={16} />
          </button>
        </div>

        {winner && (
          <div className="px-5 pt-4">
            <div
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{
                background: `${byId.get(winner.botId)?.def.color}11`,
                border: `1px solid ${byId.get(winner.botId)?.def.color}33`,
              }}
            >
              <span className="text-3xl">
                {byId.get(winner.botId)?.def.emoji}
              </span>
              <div className="flex-1">
                <div className="text-xs uppercase tracking-wider text-ink-500 font-semibold">
                  Winner
                </div>
                <div className="font-display text-lg font-semibold text-ink-900">
                  {byId.get(winner.botId)?.def.name}
                </div>
                <div className="text-xs text-ink-500">
                  Efficiency {winner.efficiency} ·{" "}
                  {byId.get(winner.botId)?.state.metrics.steps} steps ·{" "}
                  {byId.get(winner.botId)?.state.metrics.cellsExplored} cells
                </div>
              </div>
            </div>
          </div>
        )}

        <ol className="px-5 py-4 space-y-2 overflow-y-auto">
          {sorted.map((r, i) => {
            const c = byId.get(r.botId);
            if (!c) return null;
            const medalColor = i < 3 ? MEDAL_BG[i] : null;
            return (
              <li
                key={r.botId}
                className="flex items-center gap-3 px-3 py-2 rounded-xl border border-ink-100 bg-canvas-raised"
              >
                <span
                  className={clsx(
                    "w-7 h-7 rounded-lg flex items-center justify-center font-mono text-sm font-semibold",
                    medalColor ? "text-ink-900" : "text-ink-500 bg-canvas-sunken",
                  )}
                  style={medalColor ? { backgroundColor: medalColor } : undefined}
                >
                  {r.rank}
                </span>
                <span
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: c.def.color + "22" }}
                >
                  <span className="text-base leading-none">{c.def.emoji}</span>
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink-900 text-sm">
                    {c.def.name}
                  </div>
                  <div className="text-[11px] text-ink-500">
                    {r.finished ? "Reached goal" : `Status: ${c.state.status}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-ink-500">efficiency</div>
                  <div className="font-mono font-semibold text-ink-900">
                    {r.efficiency}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-ink-500">steps</div>
                  <div className="font-mono text-ink-700">
                    {c.state.metrics.steps}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="px-5 py-3 border-t border-ink-100 flex justify-end gap-2 bg-canvas-sunken/40">
          <button className="btn-ghost" onClick={onClose}>
            Keep watching
          </button>
          <button className="btn-accent" onClick={onReset}>
            <RotateCcw size={16} /> Run again
          </button>
        </div>
      </div>
    </div>
  );
}
