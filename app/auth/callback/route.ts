import { NextResponse } from "next/server";

import { withSupabaseAuthTimeout } from "@/src/lib/supabase/errors";
import { createClient } from "@/src/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();

    try {
      await withSupabaseAuthTimeout(supabase.auth.exchangeCodeForSession(code));
    } catch {
      return NextResponse.redirect(new URL("/login", requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
