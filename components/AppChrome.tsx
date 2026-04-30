"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { AuthStatus } from "@/components/AuthStatus";
import { BottomNav } from "@/components/BottomNav";
import { LearningModeSelector } from "@/components/LearningModeSelector";
import { useAuthSession } from "@/hooks/useAuthSession";

interface AppChromeProps {
  children: ReactNode;
}

function isPublicPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/auth/callback");
}

export function AppChrome({ children }: AppChromeProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthSession();
  const isPublic = isPublicPath(pathname);
  const isAuthPage = pathname === "/login";
  const shouldShowAppNav = isAuthenticated && !isPublic;

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated && !isPublic) {
      const redirectTo = `${pathname}${window.location.search}`;

      router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
      return;
    }

    if (isAuthenticated && isAuthPage) {
      router.replace("/dashboard");
    }
  }, [isAuthPage, isAuthenticated, isLoading, isPublic, pathname, router]);

  if (isLoading) {
    return (
      <main className="min-h-dvh bg-[radial-gradient(circle_at_top,_#eef7f1_0,_#f5f7fb_38%,_#edf1f7_100%)] text-ink">
        <div className="mx-auto flex min-h-dvh w-full max-w-md items-center justify-center px-4">
          <div className="h-12 w-12 animate-pulse rounded-lg bg-white shadow-soft" />
        </div>
      </main>
    );
  }

  if (!isAuthenticated && !isPublic) {
    return null;
  }

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top,_#eef7f1_0,_#f5f7fb_38%,_#edf1f7_100%)] text-ink">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
        <LearningModeSelector />
        {shouldShowAppNav ? <AuthStatus /> : null}
        {children}
      </div>
      {shouldShowAppNav ? <BottomNav /> : null}
    </main>
  );
}
