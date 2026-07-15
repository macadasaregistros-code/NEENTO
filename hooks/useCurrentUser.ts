"use client";

import type { Session, User } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";

import {
  appPersonas,
  getPersonaForEmail,
  type AppPersona,
} from "@/lib/app-persona";
import { supabase } from "@/lib/supabase";
import {
  getSupabaseAuthErrorMessage,
  withSupabaseAuthTimeout,
} from "@/src/lib/supabase/errors";

export type ProfileRole = "owner" | "worker";

export interface CurrentProfile {
  appPersona: AppPersona | null;
  fullName: string;
  id: string;
  roleGlobal: ProfileRole;
}

function getRoleForPersona(persona: AppPersona): ProfileRole {
  return persona === "daiki" ? "owner" : "worker";
}

function mapUserProfile(user: User): CurrentProfile | null {
  const appPersona = getPersonaForEmail(user.email);

  if (!appPersona) {
    return null;
  }

  return {
    appPersona,
    fullName:
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : appPersonas[appPersona].label,
    id: user.id,
    roleGlobal: getRoleForPersona(appPersona),
  };
}

export function useCurrentUser() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<CurrentProfile | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const applySession = useCallback((session: Session | null) => {
    const nextUser = session?.user ?? null;

    setUser(nextUser);
    setProfile(nextUser ? mapUserProfile(nextUser) : null);
    setError(null);
    setIsLoading(false);

    if (nextUser && !getPersonaForEmail(nextUser.email)) {
      setError("Esta app solo permite las cuentas de Daiki y Jju.");
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      type SessionResult = Awaited<ReturnType<typeof supabase.auth.getSession>>;
      const sessionResult = await withSupabaseAuthTimeout<SessionResult>(
        supabase.auth.getSession(),
      );
      const {
        data: { session },
        error: sessionError,
      } = sessionResult;

      if (sessionError) {
        setUser(null);
        setProfile(null);
        setError(getSupabaseAuthErrorMessage(sessionError));
        setIsLoading(false);
        return;
      }

      applySession(session);
    } catch (sessionError) {
      setUser(null);
      setProfile(null);
      setError(getSupabaseAuthErrorMessage(sessionError));
      setIsLoading(false);
    }
  }, [applySession]);

  useEffect(() => {
    let isMounted = true;

    refresh();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
      if (!isMounted) {
        return;
      }

      applySession(session);
      },
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [applySession, refresh]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut().catch(() => undefined);
    window.location.href = "/login";
  }, []);

  return {
    error,
    isAllowedAppUser: Boolean(profile?.appPersona),
    isLoading,
    isOwner: profile?.roleGlobal === "owner",
    profile,
    refresh,
    signOut,
    user,
  };
}
