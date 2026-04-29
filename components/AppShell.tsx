import type { ReactNode } from "react";

import { BottomNav } from "@/components/BottomNav";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#eef7f1_0,_#f5f7fb_38%,_#edf1f7_100%)] text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-28 pt-5">
        {children}
      </div>
      <BottomNav />
    </main>
  );
}
