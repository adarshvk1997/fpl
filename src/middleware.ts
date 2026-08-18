import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase auth session on every request and redirects
// unauthenticated visitors to /login for anything under the app shell.
// Public routes: /login (the magic-link request page) and /auth/callback
// (where Supabase redirects after the user clicks the magic link).
//
// NOTE: this project pins Next.js to the 15.x line (see package.json) because
// every 16.x release through 16.3.1 fails `next build` with an upstream bug
// prerendering the internal /_global-error route (vercel/next.js#87719,
// unresolved as of this writing). Next 16 renamed this file to `proxy.ts`
// with an exported `proxy` function; that convention doesn't exist on 15, so
// this stays `middleware.ts` / `middleware` until the app is upgraded.
const PUBLIC_PATHS = ["/login", "/auth/callback"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PATHS.some((p) => request.nextUrl.pathname.startsWith(p));
  const isApiCron = request.nextUrl.pathname.startsWith("/api/cron");

  if (!user && !isPublic && !isApiCron) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets and Next internals.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
