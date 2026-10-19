import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Exclus du middleware : fichiers statiques de Next, favicon, images,
    // fichiers PWA (le service worker et le manifest doivent pouvoir
    // etre servis tels quels, meme sans connexion) et la route « /api/version »
    // (elle ne renvoie qu'un numero de commit, utile pour signaler les
    // mises a jour de l'application, meme lorsque la session a expire).
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|api/version|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};