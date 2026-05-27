"use client";

import { BookOpen, Eye, Home, Mic, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLearningMode } from "@/hooks/useLearningMode";
import { triggerHaptic } from "@/lib/haptics";

const items = [
  { href: "/dashboard", label: "Home", labelKey: "home", icon: Home },
  { href: "/practice/visual", label: "Visual", labelKey: "visual", icon: Eye },
  { href: "/practice/oral", label: "Oral", labelKey: "oral", icon: Mic },
  { href: "/story", label: "Historia", icon: Sparkles },
  { href: "/vocabulary", label: "Vocabulario", labelKey: "vocabulary", icon: BookOpen },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { config, mode } = useLearningMode();
  const activeClass = mode === "ko_es" ? "bg-sky-600 text-white" : "bg-emerald-600 text-white";

  return (
    <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 bg-white/98 shadow-[0_-10px_28px_rgba(15,23,42,0.12)] backdrop-blur-xl">
      <nav className="grid grid-cols-5 gap-1 rounded-t-[1rem] border-t border-white/80 px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/" || pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={`flex h-10 flex-col items-center justify-center gap-0.5 rounded-xl text-[0.58rem] font-bold transition ${
                isActive
                  ? activeClass
                  : "text-slate-500 hover:bg-slate-100 hover:text-ink"
              }`}
              href={item.href}
              key={item.href}
              onClick={() => triggerHaptic("light")}
            >
              <Icon aria-hidden="true" size={18} strokeWidth={2.2} />
              <span>
                {"labelKey" in item ? config.copy.bottomNav[item.labelKey] : item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
