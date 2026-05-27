"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { BottomNav } from "@/components/BottomNav";
import { useLearningMode } from "@/hooks/useLearningMode";

interface AppChromeProps {
  children: ReactNode;
}

export function AppChrome({ children }: AppChromeProps) {
  const pathname = usePathname();
  const { mode } = useLearningMode();
  const isUtilityRoute = pathname === "/login" || pathname.startsWith("/auth");
  const shouldShowAppNav = !isUtilityRoute;
  const shouldLockViewport =
    pathname === "/dashboard" || pathname.startsWith("/practice");
  const themeClass =
    mode === "ko_es"
      ? "bg-[radial-gradient(circle_at_top,_#e0f2fe_0,_#f7fbff_42%,_#eef7ff_100%)]"
      : "bg-[radial-gradient(circle_at_top,_#dcfce7_0,_#f7fbf5_42%,_#eef7f0_100%)]";
  const bottomPaddingClass = shouldShowAppNav
    ? "pb-[calc(3.45rem+env(safe-area-inset-bottom))]"
    : "pb-[max(0.8rem,env(safe-area-inset-bottom))]";

  if (!shouldLockViewport) {
    return (
      <main className={`min-h-dvh text-ink ${themeClass}`}>
        <div
          className={`mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-[max(0.8rem,env(safe-area-inset-top))] ${bottomPaddingClass}`}
        >
          {children}
        </div>
        {shouldShowAppNav ? <BottomNav /> : null}
      </main>
    );
  }

  return (
    <main className={`h-dvh overflow-hidden text-ink ${themeClass}`}>
      <div
        className={`mx-auto flex h-dvh w-full max-w-md flex-col px-4 pt-[max(0.8rem,env(safe-area-inset-top))] ${bottomPaddingClass}`}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
      {shouldShowAppNav ? <BottomNav /> : null}
    </main>
  );
}
