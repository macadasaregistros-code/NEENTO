"use client";

import type { Session, User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

interface AuthGateProps {
  children: ReactNode;
}

const publicRoutePrefixes = ["/login", "/auth"];

function isPublicRoute(pathname: string): boolean {
  return publicRoutePrefixes.some((route) => pathname.startsWith(route));
}

function getRedirectPath(pathname: string): string {
  return pathname === "/" ? "/dashboard" : pathname;
}

export function AuthGate({ children }: AuthGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = useMemo(() => isPublicRoute(pathname), [pathname]);
  const [isLoading, setIsLoading] = useState(!isPublic);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (isPublic) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    supabase.auth.getUser().then((result: { data: { user: User | null } }) => {
      if (!isMounted) {
        return;
      }

      const nextUser = result.data.user;

      setUser(nextUser);
      setIsLoading(false);

      if (!nextUser) {
        router.replace(
          `/login?redirectTo=${encodeURIComponent(getRedirectPath(pathname))}`,
        );
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      if (!isMounted || isPublic) {
        return;
      }

      setUser(session?.user ?? null);

      if (!session?.user) {
        router.replace(
          `/login?redirectTo=${encodeURIComponent(getRedirectPath(pathname))}`,
        );
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isPublic, pathname, router]);

  if (!isPublic && (isLoading || !user)) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top,_#dcfce7_0,_#f7fbf5_42%,_#eef7f0_100%)] px-6 text-ink">
        <div className="rounded-2xl bg-white p-6 text-center shadow-soft ring-1 ring-white">
          <Loader2
            aria-hidden="true"
            className="mx-auto animate-spin text-emerald-600"
            size={28}
          />
          <p className="mt-3 text-sm font-black text-slate-500">
            Revisando sesion...
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
