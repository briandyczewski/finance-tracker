import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the login session and sends signed-out visitors to /login.
// Based on Supabase's Next.js guide. The data itself is protected by
// row level security in the database, so this is the first lock, not the only one.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value)
          );
        },
      },
    }
  );

  // Keep this call right after createServerClient. It verifies the session
  // and refreshes it when needed, which stops random sign-outs.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const path = request.nextUrl.pathname;
  const onAuthPage = path.startsWith("/login") || path.startsWith("/signup");

  if (!signedIn && !onAuthPage) {
    return redirectKeepingCookies(request, response, "/login");
  }

  if (signedIn && onAuthPage) {
    return redirectKeepingCookies(request, response, "/");
  }

  return response;
}

function redirectKeepingCookies(
  request: NextRequest,
  response: NextResponse,
  pathname: string
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";

  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
