import { type NextRequest, NextResponse } from "next/server";

import { withSupabaseAuthTimeout } from "@/src/lib/supabase/errors";
import { createClient } from "@/utils/supabase/middleware";

const publicRoutes = ["/login", "/auth", "/api"];

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"),
    );
}

function redirectToLogin(request: NextRequest, redirectPath: string) {
  const loginUrl = request.nextUrl.clone();

  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("redirectTo", redirectPath);

  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  if (pathname !== "/" && isPublicRoute) {
    return NextResponse.next();
  }

  if (!hasSupabaseAuthCookie(request)) {
    return redirectToLogin(
      request,
      pathname === "/" ? "/dashboard" : `${pathname}${request.nextUrl.search}`,
    );
  }

  const { response, supabase } = createClient(request);
  let user = null;

  try {
    const {
      data: { user: resolvedUser },
    } = await withSupabaseAuthTimeout(supabase.auth.getUser());

    user = resolvedUser;
  } catch {
    user = null;
  }

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
    const redirectPath = `${pathname}${request.nextUrl.search}`;

    return redirectToLogin(
      request,
      pathname === "/" ? "/dashboard" : redirectPath,
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest|manifest.json|sw.js|icons/).*)",
  ],
};
