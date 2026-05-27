"use client";

import { Languages } from "lucide-react";

import { useLearningMode } from "@/hooks/useLearningMode";
import { modeConfigs } from "@/lib/learning";
import type { LearningMode } from "@/types/card";

const modes: LearningMode[] = ["ja_es", "ko_es"];

export function LearningModeSelector() {
  const { config, mode, setMode } = useLearningMode();

  return (
    <div className="shrink-0 rounded-lg bg-white/85 p-2 shadow-sm ring-1 ring-white/80 backdrop-blur">
      <div className="mb-2 flex items-center gap-2 px-1 text-[0.68rem] font-black uppercase tracking-[0.16em] text-slate-400">
        <Languages aria-hidden="true" size={14} />
        {config.appLanguage === "ko" ? "모드" : "Modo"}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {modes.map((item) => {
          const isActive = item === mode;
          const itemConfig = modeConfigs[item];
          const activeClass =
            item === "ko_es"
              ? "bg-sky-600 text-white shadow-sm shadow-sky-100"
              : "bg-emerald-600 text-white shadow-sm shadow-emerald-100";

          return (
            <button
              className={`min-h-11 rounded-lg px-3 py-2 text-left text-xs font-black leading-tight transition active:scale-[0.98] ${
                isActive ? activeClass : "bg-slate-50 text-slate-500 hover:bg-white"
              }`}
              key={item}
              onClick={() => setMode(item)}
              type="button"
            >
              <span className="block text-[0.65rem] uppercase tracking-[0.12em] opacity-70">
                {itemConfig.shortLabel}
              </span>
              <span>{itemConfig.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
