import clsx from "clsx";
import { Check } from "lucide-react";
import type { BotDefinition } from "../types";

interface Props {
  bots: BotDefinition[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  title?: string;
}

export function BotSelector({ bots, selected, onToggle, title }: Props) {
  return (
    <div>
      {title && (
        <h3 className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-2">
          {title}
        </h3>
      )}
      <div className="grid grid-cols-1 gap-1.5">
        {bots.map((b) => {
          const active = selected.has(b.id);
          return (
            <button
              key={b.id}
              onClick={() => onToggle(b.id)}
              title={b.description}
              className={clsx(
                "flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 transition-all text-left",
                active
                  ? "border-brand-500 bg-brand-50 shadow-ring"
                  : "border-ink-100 bg-white hover:border-brand-300",
              )}
            >
              <span
                className="w-7 h-7 rounded-md flex items-center justify-center text-sm shrink-0"
                style={{ backgroundColor: b.color + "22", color: b.color }}
              >
                {b.emoji}
              </span>
              <span className="font-semibold text-ink-900 text-sm flex-1 min-w-0 truncate">
                {b.name}
              </span>
              <span
                className={clsx(
                  "shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors",
                  active
                    ? "bg-brand-500 border-brand-500 text-white"
                    : "border-ink-100",
                )}
              >
                {active && <Check size={12} strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
