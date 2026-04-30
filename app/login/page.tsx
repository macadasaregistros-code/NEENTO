"use client";

import { LockKeyhole, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";

import { useLearningMode } from "@/hooks/useLearningMode";
import { supabase } from "@/lib/supabase";

type AuthMode = "sign_in" | "sign_up";

function getSafeRedirectTo(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

function getEmailRedirectTo(origin: string, redirectTo: string): string {
  return `${origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`;
}

function LoginContent() {
  const { config } = useLearningMode();
  const router = useRouter();
  const searchParams = useSearchParams();
  const copy = config.copy.auth;
  const redirectTo = useMemo(
    () => getSafeRedirectTo(searchParams.get("redirectTo")),
    [searchParams],
  );
  const [authMode, setAuthMode] = useState<AuthMode>("sign_in");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSignUp = authMode === "sign_up";

  async function resendConfirmationEmail() {
    return supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: getEmailRedirectTo(window.location.origin, redirectTo),
      },
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    setNeedsConfirmation(false);

    const authResponse = isSignUp
      ? await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
            emailRedirectTo: getEmailRedirectTo(window.location.origin, redirectTo),
          },
        })
      : await supabase.auth.signInWithPassword({
          email,
          password,
        });

    setIsSubmitting(false);

    if (authResponse.error) {
      if (authResponse.error.message.toLowerCase().includes("email not confirmed")) {
        setNeedsConfirmation(true);
        setMessage(copy.checkConfirmationEmail);
      }

      setError(authResponse.error.message);
      return;
    }

    if (isSignUp && !authResponse.data.session) {
      const identities = authResponse.data.user?.identities ?? [];

      if (identities.length === 0) {
        const { error: resendError } = await resendConfirmationEmail();

        if (resendError) {
          setError(resendError.message);
        } else {
          setMessage(copy.confirmationResent);
        }

        setNeedsConfirmation(true);
        return;
      }

      setNeedsConfirmation(true);
      setMessage(copy.checkConfirmationEmail);
      return;
    }

    setMessage(isSignUp ? copy.accountCreated : copy.sessionStarted);
    router.replace(redirectTo);
  }

  async function handleResendConfirmation() {
    if (!email) {
      setError(copy.email);
      return;
    }

    setIsResending(true);
    setError(null);

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: getEmailRedirectTo(window.location.origin, redirectTo),
      },
    });

    setIsResending(false);

    if (resendError) {
      setError(resendError.message);
      return;
    }

    setNeedsConfirmation(true);
    setMessage(copy.confirmationResent);
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
              setNeedsConfirmation(false);
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
              setNeedsConfirmation(false);
            }}
            type="button"
          >
            {copy.createAccount}
          </button>
        </div>

        {isSignUp ? (
          <label className="mt-6 block">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              {copy.fullName}
            </span>
            <input
              className="mt-2 h-14 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-base font-bold text-ink outline-none transition focus:border-emerald-500 focus:bg-white"
              onChange={(event) => setFullName(event.target.value)}
              placeholder={copy.fullName}
              required
              type="text"
              value={fullName}
            />
          </label>
        ) : null}

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
          <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">
            <p>{message}</p>
            {needsConfirmation ? (
              <>
                <p className="mt-2 text-xs leading-5 text-emerald-700">
                  {copy.confirmationHelp}
                </p>
                <button
                  className="mt-3 h-11 w-full rounded-lg bg-emerald-700 px-4 text-sm font-black text-white transition active:scale-[0.98] disabled:opacity-60"
                  disabled={isResending}
                  onClick={handleResendConfirmation}
                  type="button"
                >
                  {isResending ? copy.resendingConfirmation : copy.resendConfirmation}
                </button>
              </>
            ) : null}
          </div>
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
