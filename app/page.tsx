import { redirect } from "next/navigation";

import { createClient } from "@/src/lib/supabase/server";

export default async function EntryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/dashboard" : "/login?redirectTo=/dashboard");
}
