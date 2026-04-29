"use client";

import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setMessage("Revisa tu correo y abre el enlace para entrar.");
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex items-center justify-between pt-2">
        <Link
          aria-label="Volver a Home"
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-ink shadow-sm ring-1 ring-slate-200"
          href="/"
        >
          <ArrowLeft aria-hidden="true" size={21} />
        </Link>
        <div className="text-right">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            cuenta
          </p>
          <h1 className="text-2xl font-black text-ink">Login</h1>
        </div>
      </header>

      <form className="mt-auto rounded-lg bg-white p-5 shadow-soft" onSubmit={handleSubmit}>
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <Mail aria-hidden="true" size={26} />
        </div>
        <h2 className="text-3xl font-black leading-tight text-ink">
          Entra con tu correo
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Te enviaremos un enlace magico. Tu progreso y tus palabras quedan ligados a tu cuenta.
        </p>

        <label className="mt-6 block">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Email
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
          {isSubmitting ? "Enviando..." : "Enviar enlace"}
        </button>
      </form>
    </div>
  );
}
