"use client";

import { LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { useLearningMode } from "@/hooks/useLearningMode";
import { supabase } from "@/lib/supabase";

type AuthMode = "sign_in" | "sign_up";

export default function LoginPage() {
  const { config } = useLearningMode();
  const router = useRouter();
  const copy = config.copy.auth;
  const [authMode, setAuthMode] = useState<AuthMode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSignUp = authMode === "sign_up";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const authResponse = isSignUp
      ? await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
      : await supabase.auth.signInWithPassword({
          email,
          password,
        });

    setIsSubmitting(false);

    if (authResponse.error) {
      setError(authResponse.error.message);
      return;
    }

    if (isSignUp && !authResponse.data.session) {
      setMessage(copy.checkConfirmationEmail);
      return;
    }

    setMessage(isSignUp ? copy.accountCreated : copy.sessionStarted);
    router.replace("/");
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex items-center justify-between pt-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            Neento
          </p>
          <h1 className="mt-1 text-4xl font-black leading-none text-ink">
            {copy.login}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            {isSignUp ? copy.createAccount : copy.enter}
          </p>
        </div>
      </header>

      <form className="mt-auto rounded-lg bg-white p-5 shadow-soft" onSubmit={handleSubmit}>
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          {isSignUp ? <LockKeyhole aria-hidden="true" size={26} /> : <Mail aria-hidden="true" size={26} />}
        </div>
        <h2 className="text-3xl font-black leading-tight text-ink">
          {copy.loginTitle}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {copy.loginDescription}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
          <button
            className={`h-11 rounded-lg text-sm font-black transition ${
              !isSignUp ? "bg-white text-ink shadow-sm" : "text-slate-500"
            }`}
            onClick={() => {
              setAuthMode("sign_in");
              setError(null);
              setMessage(null);
            }}
            type="button"
          >
            {copy.enter}
          </button>
          <button
            className={`h-11 rounded-lg text-sm font-black transition ${
              isSignUp ? "bg-white text-ink shadow-sm" : "text-slate-500"
            }`}
            onClick={() => {
              setAuthMode("sign_up");
              setError(null);
              setMessage(null);
            }}
            type="button"
          >
            {copy.createAccount}
          </button>
        </div>

        <label className="mt-6 block">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            {copy.email}
          </span>
          <input
            className="mt-2 h-14 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-base font-bold text-ink outline-none transition focus:border-emerald-500 focus:bg-white"
            inputMode="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tu@email.com"
            required
            type="email"
            value={email}
          />
        </label>

        <label className="mt-4 block">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            {copy.password}
          </span>
          <input
            className="mt-2 h-14 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-base font-bold text-ink outline-none transition focus:border-emerald-500 focus:bg-white"
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="******"
            required
            type="password"
            value={password}
          />
        </label>

        {message ? (
          <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">
            {message}
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ring-1 ring-red-100">
            {error}
          </p>
        ) : null}

        <button
          className="mt-6 h-14 w-full rounded-lg bg-ink px-4 text-sm font-black text-white shadow-soft transition active:scale-[0.98] disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "..." : isSignUp ? copy.signUpCta : copy.signInCta}
        </button>
      </form>
    </div>
  );
}
