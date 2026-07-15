import { redirect } from "next/navigation";

import { withSupabaseAuthTimeout } from "@/src/lib/supabase/errors";
import { createClient } from "@/src/lib/supabase/server";

export default async function EntryPage() {
  const supabase = await createClient();
  let user = null;

  try {
    const {
      data: { user: resolvedUser },
    } = await withSupabaseAuthTimeout(supabase.auth.getUser());

    user = resolvedUser;
  } catch {
    user = null;
  }

  redirect(user ? "/dashboard" : "/login?redirectTo=/dashboard");
}
