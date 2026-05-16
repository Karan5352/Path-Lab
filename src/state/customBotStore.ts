import { useSyncExternalStore } from "react";
import { compileCustomBot, DEFAULT_CUSTOM_BOT_CODE } from "../bots/custom";
import type { BotDefinition } from "../types";

const STORAGE_KEY = "pathlab.customBot.v1";

export interface CustomBotMeta {
  name: string;
  color: string;
  emoji: string;
  code: string;
}

interface State {
  meta: CustomBotMeta;
  bot: BotDefinition | null;
  compileError: string | null;
}

function loadInitial(): State {
  if (typeof window === "undefined") {
    return defaultState();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<CustomBotMeta>;
    const meta: CustomBotMeta = {
      name: parsed.name ?? "Custom Bot",
      color: parsed.color ?? "#6E45FF",
      emoji: parsed.emoji ?? "🛠️",
      code: parsed.code ?? DEFAULT_CUSTOM_BOT_CODE,
    };
    const compiled = compileCustomBot(meta.code, {
      id: "custom",
      name: meta.name,
      color: meta.color,
      emoji: meta.emoji,
    });
    return {
      meta,
      bot: compiled.ok ? compiled.bot! : null,
      compileError: compiled.ok ? null : compiled.error ?? "Failed to compile.",
    };
  } catch {
    return defaultState();
  }
}

function defaultState(): State {
  const meta: CustomBotMeta = {
    name: "Custom Bot",
    color: "#6E45FF",
    emoji: "🛠️",
    code: DEFAULT_CUSTOM_BOT_CODE,
  };
  const compiled = compileCustomBot(meta.code, {
    id: "custom",
    name: meta.name,
    color: meta.color,
    emoji: meta.emoji,
  });
  return {
    meta,
    bot: compiled.ok ? compiled.bot! : null,
    compileError: compiled.ok ? null : compiled.error ?? "Failed to compile.",
  };
}

let state: State = loadInitial();
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.meta));
  } catch {
    // ignore: private mode, quota, etc.
  }
}

export const customBotStore = {
  get(): State {
    return state;
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  setMeta(meta: CustomBotMeta) {
    const compiled = compileCustomBot(meta.code, {
      id: "custom",
      name: meta.name,
      color: meta.color,
      emoji: meta.emoji,
    });
    state = {
      meta,
      bot: compiled.ok ? compiled.bot! : null,
      compileError: compiled.ok ? null : compiled.error ?? "Failed to compile.",
    };
    persist();
    notify();
  },
};

export function useCustomBot(): State {
  return useSyncExternalStore(
    (cb) => customBotStore.subscribe(cb),
    () => customBotStore.get(),
    () => customBotStore.get(),
  );
}
