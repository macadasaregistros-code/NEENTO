"use client";

import { BookOpen, Eye, Home, Mic } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLearningMode } from "@/hooks/useLearningMode";
import { triggerHaptic } from "@/lib/haptics";

const items = [
  { href: "/", labelKey: "home", icon: Home },
  { href: "/practice/visual", labelKey: "visual", icon: Eye },
  { href: "/practice/oral", labelKey: "oral", icon: Mic },
  { href: "/vocabulary", labelKey: "vocabulary", icon: BookOpen },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { config, mode } = useLearningMode();
  const activeClass = mode === "ko_es" ? "bg-sky-600 text-white" : "bg-emerald-600 text-white";

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <nav className="grid grid-cols-4 gap-2 rounded-lg border border-white/80 bg-white/95 p-2 shadow-soft backdrop-blur-xl">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={`flex h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-semibold transition ${
                isActive
                  ? activeClass
                  : "text-slate-500 hover:bg-slate-100 hover:text-ink"
              }`}
              href={item.href}
              key={item.href}
              onClick={() => triggerHaptic("light")}
            >
              <Icon aria-hidden="true" size={20} strokeWidth={2.2} />
              <span>{config.copy.bottomNav[item.labelKey]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
