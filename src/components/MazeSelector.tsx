import clsx from "clsx";
import type { Maze } from "../types";

interface Props {
  mazes: Maze[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const DIFFICULTY_STYLES: Record<Maze["difficulty"], string> = {
  easy: "bg-emerald-50 text-emerald-700 border-emerald-100",
  medium: "bg-amber-50 text-amber-700 border-amber-100",
  hard: "bg-rose-50 text-rose-700 border-rose-100",
  boss: "bg-violet-50 text-violet-700 border-violet-200",
};

export function MazeSelector({ mazes, selectedId, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {mazes.map((m) => {
        const active = m.id === selectedId;
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            title={m.description}
            className={clsx(
              "text-left rounded-xl border px-3 py-2 transition-all",
              active
                ? "border-brand-500 bg-brand-50 shadow-ring"
                : "border-ink-100 bg-white hover:border-brand-300",
            )}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-ink-900 text-sm">
                {m.name}
              </span>
              <span
                className={clsx(
                  "pill border shrink-0",
                  DIFFICULTY_STYLES[m.difficulty],
                )}
              >
                {m.difficulty}
              </span>
              <span className="text-[10px] text-ink-300 font-mono ml-auto">
                {m.width}×{m.height}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
