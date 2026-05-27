"use client";

import { Loader2, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { useCurrentUser } from "@/hooks/useCurrentUser";

interface AppAccessGateProps {
  children: ReactNode;
}

const publicRoutePrefixes = ["/login", "/auth"];

function isPublicRoute(pathname: string): boolean {
  return publicRoutePrefixes.some((route) => pathname.startsWith(route));
}

export function AppAccessGate({ children }: AppAccessGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = useMemo(() => isPublicRoute(pathname), [pathname]);
  const { error, isAllowedAppUser, isLoading, signOut, user } = useCurrentUser();
  const [shouldShowLoading, setShouldShowLoading] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShouldShowLoading(false);
      return;
    }

    const timeout = window.setTimeout(() => setShouldShowLoading(true), 280);

    return () => window.clearTimeout(timeout);
  }, [isLoading]);

  useEffect(() => {
    if (isPublic || isLoading || user) {
      return;
    }

    const redirectPath =
      typeof window === "undefined"
        ? pathname
        : `${pathname}${window.location.search}`;

    router.replace(`/login?redirectTo=${encodeURIComponent(redirectPath)}`);
  }, [isLoading, isPublic, pathname, router, user]);

  if (isPublic) {
    return <>{children}</>;
  }

  if (isLoading || !user) {
    if (!shouldShowLoading) {
      return null;
    }

    return (
      <main className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top,_#dcfce7_0,_#f7fbf5_42%,_#eef7f0_100%)] px-6 text-ink">
        <div className="rounded-lg bg-white p-6 text-center shadow-soft ring-1 ring-white">
          <Loader2
            aria-hidden="true"
            className="mx-auto animate-spin text-emerald-600"
            size={28}
          />
          <p className="mt-3 text-sm font-black text-slate-500">
            Abriendo Neento...
          </p>
        </div>
      </main>
    );
  }

  if (!isAllowedAppUser) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top,_#fee2e2_0,_#fff7f7_42%,_#fef2f2_100%)] px-6 text-ink">
        <section className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-soft ring-1 ring-white">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
            Cuenta bloqueada
          </p>
          <h1 className="mt-3 text-3xl font-black leading-tight text-ink">
            Neento solo permite Daiki y Jju
          </h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
            Esta cuenta no esta autorizada para usar la app. Entra con la cuenta
            de Daiki o Jju.
          </p>
          {error ? (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 ring-1 ring-red-100">
              {error}
            </p>
          ) : null}
          <button
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-black text-white shadow-lg shadow-red-100 transition active:scale-[0.98]"
            onClick={signOut}
            type="button"
          >
            <LogOut aria-hidden="true" size={18} />
            Cerrar sesion
          </button>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
