import { NextResponse, type NextRequest } from "next/server";

/**
 * TEK ŞİFRELİ KAPI
 *
 * Sayfada 2.871 ürün, fiyatları ve stok notlarıyla duruyor. Arama motorları
 * zaten kapalı (noindex + robots.txt) ama adresi bilen herkesin görmesini
 * istemiyoruz. Tarayıcının kendi parola kutusunu (HTTP Basic) kullanıyoruz:
 * ek bir giriş sayfası yazmaya gerek kalmıyor, şifre tarayıcıda hatırlanıyor.
 *
 * Şifre KONTROL_SIFRE ortam değişkeninden gelir. Tanımlı değilse kapı
 * açılmaz — yanlışlıkla herkese açık yayına çıkmasın diye bilerek böyle.
 */
export const config = {
  // _next/static ve favicon hariç her şey kapının arkasında.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

const KAPI = 'Basic realm="Paw Lounge kontrol", charset="UTF-8"';

/** Zamanlama sızdırmayan karşılaştırma. */
function esit(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let fark = 0;
  for (let i = 0; i < a.length; i++) fark |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return fark === 0;
}

export function middleware(istek: NextRequest) {
  const sifre = process.env.KONTROL_SIFRE;

  if (!sifre) {
    return new NextResponse(
      "Kontrol sayfası kapalı: sunucuda KONTROL_SIFRE tanımlı değil.",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const baslik = istek.headers.get("authorization") || "";
  if (baslik.startsWith("Basic ")) {
    let cozulmus = "";
    try {
      cozulmus = atob(baslik.slice(6));
    } catch {
      cozulmus = "";
    }
    // "kullanıcı:şifre" — kullanıcı adını önemsemiyoruz, tek şifre yeter.
    const ayrac = cozulmus.indexOf(":");
    const verilen = ayrac === -1 ? "" : cozulmus.slice(ayrac + 1);
    if (verilen && esit(verilen, sifre)) return NextResponse.next();
  }

  return new NextResponse("Giriş gerekli.", {
    status: 401,
    headers: {
      "WWW-Authenticate": KAPI,
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
