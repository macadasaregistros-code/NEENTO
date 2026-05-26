"use client";

import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Suspense, useState } from "react";

import { useLearningMode } from "@/hooks/useLearningMode";
import { getPersonaForEmail } from "@/lib/app-persona";
import { createClient } from "@/src/lib/supabase/client";

const authText = {
  email: "Correo",
  loginDescription:
    "Usa la cuenta autorizada de Daiki o Jju. Tu progreso queda separado por modo.",
  loginTitle: "Entrar",
  password: "Contrasena",
  passwordAccountHelp:
    "Si antes usabas magic link y nunca creaste contrasena, esa cuenta puede necesitar una contrasena nueva.",
  signInCta: "Entrar",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const { mode } = useLearningMode();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isJju = mode === "ko_es";
  const accentClass = isJju ? "bg-sky-600 shadow-sky-100" : "bg-emerald-600 shadow-emerald-100";
  const ringClass = isJju ? "focus-within:ring-sky-300" : "focus-within:ring-emerald-300";
  const submitLabel = isLoading ? "Procesando..." : authText.signInCta;
  const title = authText.loginTitle;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!getPersonaForEmail(normalizedEmail)) {
      setIsLoading(false);
      setMessage("Esta app solo permite las cuentas de Daiki y Jju.");
      return;
    }

    const supabase = createClient();
    const result = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (result.error) {
      setIsLoading(false);
      setMessage(result.error.message);
      return;
    }

    setIsLoading(false);
    window.location.replace(redirectTo);
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-1 py-6">
      <section className="rounded-[1.35rem] bg-white/95 p-5 shadow-soft ring-1 ring-white">
        <div className="mb-6">
          <p
            className={`text-xs font-black uppercase tracking-[0.2em] ${
              isJju ? "text-sky-700" : "text-emerald-700"
            }`}
          >
            Neento
          </p>
          <h1 className="mt-2 text-4xl font-black leading-none text-ink">{title}</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
            {authText.loginDescription}
          </p>
          <p className="mt-2 text-xs font-bold leading-5 text-slate-400">
            {authText.passwordAccountHelp}
          </p>
        </div>

        <form className="grid gap-3" onSubmit={handleSubmit}>
          <AuthField
            autoComplete="email"
            icon={<Mail aria-hidden="true" size={18} />}
            label={authText.email}
            onChange={setEmail}
            placeholder="correo@ejemplo.com"
            required
            ringClass={ringClass}
            type="email"
            value={email}
          />

          <label
            className={`grid gap-2 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200 transition ${ringClass}`}
          >
            <span className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-slate-400">
              {authText.password}
            </span>
            <span className="flex items-center gap-3">
              <LockKeyhole aria-hidden="true" className="text-slate-400" size={18} />
              <input
                autoComplete="current-password"
                className="h-8 min-w-0 flex-1 bg-transparent text-sm font-bold text-ink outline-none placeholder:text-slate-400"
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={authText.password}
                required
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={showPassword ? "Ocultar password" : "Mostrar password"}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" size={17} />
                ) : (
                  <Eye aria-hidden="true" size={17} />
                )}
              </button>
            </span>
          </label>

          {message ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-bold leading-5 text-amber-800 ring-1 ring-amber-100">
              {message}
            </p>
          ) : null}

          <button
            className={`mt-1 flex h-14 items-center justify-center rounded-lg px-4 text-base font-black text-white shadow-lg transition active:scale-[0.98] disabled:opacity-70 ${accentClass}`}
            disabled={isLoading}
            type="submit"
          >
            {submitLabel}
          </button>
        </form>
      </section>
    </div>
  );
}

function AuthField({
  autoComplete,
  icon,
  label,
  onChange,
  placeholder,
  required,
  ringClass,
  type = "text",
  value,
}: {
  autoComplete: string;
  icon: ReactNode;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  ringClass: string;
  type?: string;
  value: string;
}) {
  return (
    <label
      className={`grid gap-2 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200 transition ${ringClass}`}
    >
      <span className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>
      <span className="flex items-center gap-3">
        <span className="text-slate-400">{icon}</span>
        <input
          autoComplete={autoComplete}
          className="h-8 min-w-0 flex-1 bg-transparent text-sm font-bold text-ink outline-none placeholder:text-slate-400"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          type={type}
          value={value}
        />
      </span>
    </label>
  );
}

function LoginFallback() {
  return (
    <div className="flex min-h-dvh flex-col justify-center px-1 py-6">
      <section className="rounded-[1.35rem] bg-white/95 p-5 shadow-soft ring-1 ring-white">
        <div className="h-10 w-2/3 rounded-full bg-slate-100" />
        <div className="mt-4 h-4 w-full rounded-full bg-slate-100" />
        <div className="mt-8 grid gap-3">
          <div className="h-14 rounded-lg bg-slate-100" />
          <div className="h-14 rounded-lg bg-slate-100" />
          <div className="h-14 rounded-lg bg-slate-100" />
        </div>
      </section>
    </div>
  );
}
