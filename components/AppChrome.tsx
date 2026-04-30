"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { BottomNav } from "@/components/BottomNav";
import { LearningModeSelector } from "@/components/LearningModeSelector";

interface AppChromeProps {
  children: ReactNode;
}

export function AppChrome({ children }: AppChromeProps) {
  const pathname = usePathname();
  const isUtilityRoute = pathname === "/login" || pathname.startsWith("/auth");
  const shouldShowAppNav = !isUtilityRoute;

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top,_#eef7f1_0,_#f5f7fb_38%,_#edf1f7_100%)] text-ink">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
        <LearningModeSelector />
        {children}
      </div>
      {shouldShowAppNav ? <BottomNav /> : null}
    </main>
  );
}
