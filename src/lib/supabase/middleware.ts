import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const chemin = request.nextUrl.pathname;
  const isLoginPage = chemin.startsWith("/login");

  // Pages accessibles sans connexion : connexion, mot de passe oublié,
  // lien de réinitialisation reçu par e-mail, retour d'authentification,
  // page « hors connexion » (utilisée par le service worker PWA).
  const cheminsPublics = [
    "/login",
    "/mot-de-passe-oublie",
    "/reinitialiser-mot-de-passe",
    "/auth/callback",
    "/offline",
  ];
  const estPublic = cheminsPublics.some((c) => chemin === c || chemin.startsWith(`${c}/`));

  if (!user && !estPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}