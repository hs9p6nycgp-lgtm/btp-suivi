import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Exclus du middleware : fichiers statiques de Next, favicon, images,
    // et fichiers PWA (le service worker et le manifest doivent pouvoir
    // etre servis tels quels, meme sans connexion).
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};