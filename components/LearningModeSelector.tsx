"use client";

import { Languages } from "lucide-react";

import { useLearningMode } from "@/hooks/useLearningMode";
import { modeConfigs } from "@/lib/learning";
import type { LearningMode } from "@/types/card";

const modes: LearningMode[] = ["ja_es", "ko_es"];

export function LearningModeSelector() {
  const { config, mode, setMode } = useLearningMode();

  return (
    <div className="mb-3 rounded-lg bg-white/90 p-1 shadow-sm ring-1 ring-slate-200">
      <div className="mb-1 flex items-center gap-2 px-2 pt-1 text-[0.68rem] font-black uppercase tracking-[0.16em] text-slate-400">
        <Languages aria-hidden="true" size={14} />
        {config.appLanguage === "ko" ? "모드" : "Modo"}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {modes.map((item) => {
          const isActive = item === mode;
          const itemConfig = modeConfigs[item];

          return (
            <button
              className={`min-h-12 rounded-lg px-2 py-2 text-xs font-black leading-tight transition ${
                isActive
                  ? "bg-ink text-white"
                  : "text-slate-500 hover:bg-slate-100"
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
