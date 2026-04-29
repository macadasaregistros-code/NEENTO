"use client";

import { LogIn, LogOut, UserRound } from "lucide-react";
import Link from "next/link";

import { useAuthSession } from "@/hooks/useAuthSession";
import { useLearningMode } from "@/hooks/useLearningMode";
import { triggerHaptic } from "@/lib/haptics";

export function AuthStatus() {
  const { isLoading, signOut, user } = useAuthSession();
  const { config } = useLearningMode();
  const copy = config.copy.auth;

  if (isLoading) {
    return (
      <div className="mb-4 h-10 rounded-lg bg-white/70 shadow-sm ring-1 ring-white" />
    );
  }

  if (!user) {
    return (
      <Link
        className="mb-4 flex h-10 items-center justify-center gap-2 rounded-lg bg-white/90 px-4 text-sm font-black text-ink shadow-sm ring-1 ring-slate-200"
        href="/login"
        onClick={() => triggerHaptic("light")}
      >
        <LogIn aria-hidden="true" size={17} />
        {copy.login}
      </Link>
    );
  }

  return (
    <div className="mb-4 flex h-10 items-center justify-between gap-3 rounded-lg bg-white/90 px-3 text-sm shadow-sm ring-1 ring-slate-200">
      <div className="flex min-w-0 items-center gap-2">
        <UserRound aria-hidden="true" className="shrink-0 text-emerald-700" size={17} />
        <span className="truncate font-bold text-slate-600">{user.email}</span>
      </div>
      <button
        aria-label={copy.logout}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
        onClick={() => {
          triggerHaptic("light");
          void signOut();
        }}
        type="button"
      >
        <LogOut aria-hidden="true" size={17} />
      </button>
    </div>
  );
}
