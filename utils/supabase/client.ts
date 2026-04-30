import { createBrowserClient } from "@supabase/ssr";

import { supabasePublishableKey, supabaseUrl } from "@/src/lib/supabase/config";

export const createClient = () =>
  createBrowserClient(supabaseUrl, supabasePublishableKey);
