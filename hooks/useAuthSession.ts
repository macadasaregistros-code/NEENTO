"use client";

import type { Session, User } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      setSession(data.session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  return {
    isAuthenticated: Boolean(session?.user),
    isLoading,
    session,
    signOut,
    user: session?.user as User | undefined,
  };
}
