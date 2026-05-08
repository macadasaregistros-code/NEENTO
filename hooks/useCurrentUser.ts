"use client";

import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export type ProfileRole = "owner" | "worker";

export interface CurrentProfile {
  fullName: string;
  id: string;
  roleGlobal: ProfileRole;
}

interface ProfileRow {
  full_name: string | null;
  id: string;
  role_global: ProfileRole | null;
}

function mapProfile(row: ProfileRow): CurrentProfile {
  return {
    fullName: row.full_name ?? "",
    id: row.id,
    roleGlobal: row.role_global ?? "worker",
  };
}

export function useCurrentUser() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<CurrentProfile | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const {
      data: { user: nextUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !nextUser) {
      setUser(null);
      setProfile(null);
      setError(userError?.message ?? null);
      setIsLoading(false);
      return;
    }

    setUser(nextUser);

    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, role_global")
      .eq("id", nextUser.id)
      .maybeSingle();

    if (profileError) {
      setProfile(null);
      setError(profileError.message);
      setIsLoading(false);
      return;
    }

    if (data) {
      setProfile(mapProfile(data as ProfileRow));
      setIsLoading(false);
      return;
    }

    const { data: ensuredProfile, error: ensureError } =
      await supabase.rpc("ensure_current_profile");

    if (ensureError || !ensuredProfile) {
      setProfile(null);
      setError(ensureError?.message ?? "No se pudo cargar el perfil.");
      setIsLoading(false);
      return;
    }

    setProfile(mapProfile(ensuredProfile as ProfileRow));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    refresh().finally(() => {
      if (!isMounted) {
        return;
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [refresh]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }, []);

  return {
    error,
    isLoading,
    isOwner: profile?.roleGlobal === "owner",
    profile,
    refresh,
    signOut,
    user,
  };
}
