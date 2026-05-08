import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/middleware";

const publicRoutes = ["/login", "/auth"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
  const { response, supabase } = createClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname === "/") {
    const entryUrl = request.nextUrl.clone();

    entryUrl.pathname = user ? "/dashboard" : "/login";
    entryUrl.search = "";

    if (!user) {
      entryUrl.searchParams.set("redirectTo", "/dashboard");
    }

    return NextResponse.redirect(entryUrl);
  }

  if (!user && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone();

    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", pathname === "/" ? "/dashboard" : pathname);

    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest|manifest.json|sw.js|icons/).*)",
  ],
};
