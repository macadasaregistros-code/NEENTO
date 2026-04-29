"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function completeSignIn() {
      const code = searchParams.get("code");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }
      } else {
        const { error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          setError(sessionError.message);
          return;
        }
      }

      router.replace("/");
    }

    void completeSignIn();
  }, [router, searchParams]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <Loader2 aria-hidden="true" className="animate-spin text-emerald-700" size={34} />
      <h1 className="text-2xl font-black text-ink">
        {error ? "No se pudo iniciar sesion" : "Entrando..."}
      </h1>
      {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallbackContent />
    </Suspense>
  );
}
