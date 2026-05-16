import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ChevronDown, FileCode2, Wand2 } from "lucide-react";
import clsx from "clsx";
import { compileCustomBot, STARTER_TEMPLATES } from "../bots";
import { customBotStore, useCustomBot } from "../state/customBotStore";

const COLOR_CHOICES = [
  "#6E45FF",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#14B8A6",
  "#F97316",
];

// Generous emoji palette grouped roughly by vibe. Picked to render reliably
// on macOS and Windows default font stacks.
const EMOJI_PALETTE: { group: string; items: string[] }[] = [
  {
    group: "Tools",
    items: ["🛠️", "🤖", "🎯", "⚡", "💡", "🔧", "⚙️", "🧠", "🧪", "🔬"],
  },
  {
    group: "Faces",
    items: ["😎", "🤓", "🧐", "😼", "😈", "👀", "🥸", "🤠", "🥷", "🦸"],
  },
  {
    group: "Animals",
    items: ["🦊", "🐍", "🦅", "🦔", "🐙", "🐢", "🦝", "🦦", "🐉", "🦄", "🐅", "🦓", "🐝", "🦋", "🐜"],
  },
  {
    group: "Creatures",
    items: ["👾", "🤖", "👽", "👻", "🧞", "🧜", "🧚", "🦾", "🦿", "💀"],
  },
  {
    group: "Sports & speed",
    items: ["🏎️", "🚀", "🛸", "⚽", "🏀", "🎾", "🎱", "🏹", "🛼", "🛹"],
  },
  {
    group: "Objects",
    items: ["💎", "🔮", "🗝️", "🧭", "⚔️", "🛡️", "🎲", "🎰", "🎮", "🪄"],
  },
  {
    group: "Symbols",
    items: ["⭐", "🌟", "✨", "💫", "🔥", "❄️", "🌀", "💢", "💥", "⚡"],
  },
];

export function Editor() {
  const stored = useCustomBot();
  const [name, setName] = useState(stored.meta.name);
  const [color, setColor] = useState(stored.meta.color);
  const [emoji, setEmoji] = useState(stored.meta.emoji);
  const [code, setCode] = useState(stored.meta.code);
  const [status, setStatus] = useState<{
    ok: boolean;
    msg: string;
  }>({ ok: !!stored.bot, msg: stored.compileError ?? "Bot is compiled and ready." });

  // Debounced live compile.
  useEffect(() => {
    const t = setTimeout(() => {
      const compiled = compileCustomBot(code, { id: "custom", name, color, emoji });
      if (compiled.ok) {
        setStatus({ ok: true, msg: "Bot is compiled and ready." });
      } else {
        setStatus({ ok: false, msg: compiled.error ?? "Compile failed." });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [code, name, color, emoji]);

  const save = () => {
    customBotStore.setMeta({ name, color, emoji, code });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 grid lg:grid-cols-[340px_1fr] gap-5">
      <aside className="space-y-4">
        <div className="surface p-4">
          <div className="flex items-center gap-2">
            <FileCode2 size={16} className="text-brand-600" />
            <h2 className="font-display font-semibold text-ink-900">
              Bot details
            </h2>
          </div>
          <div className="mt-3 space-y-3">
            <label className="block text-xs font-semibold text-ink-500">
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm font-medium text-ink-900"
              />
            </label>
            <div>
              <span className="block text-xs font-semibold text-ink-500 mb-1">
                Color
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_CHOICES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={clsx(
                      "w-7 h-7 rounded-lg border-2",
                      color === c ? "border-ink-900" : "border-transparent",
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>
            <div>
              <span className="block text-xs font-semibold text-ink-500 mb-1">
                Emoji
              </span>
              <EmojiPicker value={emoji} onChange={setEmoji} />
            </div>
          </div>
        </div>

        <div className="surface p-4">
          <div className="flex items-center gap-2">
            <Wand2 size={16} className="text-brand-600" />
            <h2 className="font-display font-semibold text-ink-900">
              Starter templates
            </h2>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            Load one to start, then tweak. Replaces your current code.
          </p>
          <div className="mt-2 space-y-1.5">
            {STARTER_TEMPLATES.map((t) => (
              <button
                key={t.name}
                onClick={() => setCode(t.code)}
                className="block w-full text-left rounded-lg border border-ink-100 bg-white px-3 py-2 hover:border-brand-300 transition-colors"
              >
                <div className="font-semibold text-sm text-ink-900">
                  {t.name}
                </div>
                <div className="text-[11px] text-ink-500 leading-snug">
                  {t.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="surface p-4 text-sm text-ink-500 leading-relaxed">
          <p>
            Your bot runs <em>in your browser</em> via a sandboxed{" "}
            <code className="text-ink-700">new Function</code>. No code is sent
            anywhere. If <code>chooseMove</code> takes more than 250&nbsp;ms,
            your bot is disqualified to keep the arena responsive.
          </p>
        </div>
      </aside>

      <section className="space-y-3 min-w-0">
        <div className="surface p-4 flex flex-wrap items-center gap-3">
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ backgroundColor: color + "22", color }}
          >
            {emoji}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-display font-semibold text-ink-900 truncate">
              {name || "Custom Bot"}
            </div>
            <div
              className={clsx(
                "text-xs mt-0.5 flex items-center gap-1.5",
                status.ok ? "text-emerald-600" : "text-rose-600",
              )}
            >
              {status.ok ? (
                <CheckCircle2 size={13} />
              ) : (
                <AlertTriangle size={13} />
              )}
              {status.msg}
            </div>
          </div>
          <button
            className="btn-primary"
            onClick={save}
            disabled={!status.ok}
            title={status.ok ? "Save to local storage" : "Fix errors first"}
          >
            Save bot
          </button>
          <Link
            to="/arena"
            className={clsx(
              "btn-accent",
              !status.ok && "pointer-events-none opacity-50",
            )}
          >
            Test in arena
          </Link>
        </div>

        <div className="surface p-0 overflow-hidden">
          <div className="px-4 py-2 border-b border-ink-100 bg-canvas-sunken/60 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-ink-500 font-semibold">
              chooseMove(context)
            </span>
            <span className="text-[11px] text-ink-500 font-mono">
              {code.split("\n").length} lines
            </span>
          </div>
          <textarea
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                e.preventDefault();
                const t = e.currentTarget;
                const s = t.selectionStart;
                const en = t.selectionEnd;
                const next = t.value.slice(0, s) + "  " + t.value.slice(en);
                setCode(next);
                requestAnimationFrame(() => {
                  t.selectionStart = t.selectionEnd = s + 2;
                });
              }
            }}
            className="code-editor block w-full h-[60vh] min-h-[420px] resize-y bg-white text-ink-900 outline-none px-4 py-3"
          />
        </div>

        <ContextDocs />
      </section>
    </div>
  );
}

function EmojiPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (e: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "w-full flex items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 transition-colors",
          open ? "border-brand-500 shadow-ring" : "border-ink-100 hover:border-brand-300",
        )}
      >
        <span className="flex items-center gap-2">
          <span className="text-xl leading-none">{value}</span>
          <span className="text-sm text-ink-700">Change</span>
        </span>
        <ChevronDown
          size={14}
          className={clsx("text-ink-500 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="absolute z-20 mt-1.5 left-0 right-0 surface p-3 max-h-72 overflow-y-auto animate-fade-in">
          {EMOJI_PALETTE.map((g) => (
            <div key={g.group} className="mb-2 last:mb-0">
              <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-1">
                {g.group}
              </div>
              <div className="grid grid-cols-8 gap-1">
                {g.items.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      onChange(e);
                      setOpen(false);
                    }}
                    className={clsx(
                      "w-7 h-7 rounded-md flex items-center justify-center text-lg transition-colors",
                      e === value
                        ? "bg-brand-50 ring-2 ring-brand-300"
                        : "hover:bg-canvas-sunken",
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContextDocs() {
  return (
    <div className="surface p-4">
      <h3 className="font-display font-semibold text-ink-900 text-sm">
        The <code className="text-brand-600">context</code> argument
      </h3>
      <div className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
        <DocRow k="current" v="{ x, y } your position this tick" />
        <DocRow k="goal" v="{ x, y } the goal cell" />
        <DocRow k="neighbors" v="{ up, down, left, right } cell kinds" />
        <DocRow k="visited" v="Set of visited 'x,y' strings" />
        <DocRow k="visitCount" v="Map<'x,y', count>" />
        <DocRow k="trail" v="ordered array of positions" />
        <DocRow k="maze" v="full maze (omniscient only)" />
        <DocRow k="discovered" v="Map of seen cells (always)" />
        <DocRow k="mode" v="'omniscient' | 'explorer'" />
        <DocRow k="memory" v="persistent object across calls" />
        <DocRow k="steps" v="count of moves so far" />
        <DocRow k="lastDirection" v="last direction returned" />
      </div>
    </div>
  );
}

function DocRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2 py-1 border-b border-ink-100 last:border-b-0">
      <code className="text-brand-700 font-mono">{k}</code>
      <span className="text-ink-500">{v}</span>
    </div>
  );
}
