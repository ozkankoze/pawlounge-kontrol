import { neon } from "@neondatabase/serverless";

/**
 * İŞARETLER (api.php'nin yerine geçer)
 *
 * Özgün araç işaretleri sunucudaki data/marks.json dosyasına yazıyordu.
 * Vercel'de dosya sistemi salt okunur ve PHP yok, bu yüzden aynı sözleşmeyi
 * koruyup kaydı Postgres'e taşıdık:
 *
 *   GET  /api.php            -> { "<stok kodu>": "yes" | "no", ... }
 *   POST /api.php  {k, v}    -> aynı nesneyi döndürür
 *
 * Sayfanın betiği bu iki yanıttan başka bir şey beklemiyor; v boş gelirse
 * işaret silinir (kullanıcı aynı düğmeye ikinci kez bastığında olan bu).
 *
 * ⚠️ Doğrulama kuralları api.php ile birebir aynı tutuldu: anahtar biçimi
 * ve 5000 kayıt sınırı. Araç 2.871 ürünle çalışıyor, sınır bolca yeter ama
 * bozuk bir istemcinin tabloyu şişirmesini de engelliyor.
 */

export const dynamic = "force-dynamic";

const ANAHTAR_BICIMI = /^[A-Za-z0-9\-_ ().]{1,40}$/;
const AZAMI_KAYIT = 5000;

const baglanti = process.env.DATABASE_URL;
const sql = baglanti ? neon(baglanti) : null;

let hazir = false;
async function semaHazirla() {
  if (!sql || hazir) return;
  await sql`
    CREATE TABLE IF NOT EXISTS pawlounge_marks (
      k          TEXT PRIMARY KEY,
      v          TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  hazir = true;
}

const BASLIK = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

function hata(mesaj: string, kod: number) {
  return new Response(JSON.stringify({ error: mesaj }), { status: kod, headers: BASLIK });
}

async function tumIsaretler(): Promise<Record<string, string>> {
  if (!sql) return {};
  const satirlar = (await sql`SELECT k, v FROM pawlounge_marks`) as { k: string; v: string }[];
  const o: Record<string, string> = {};
  for (const s of satirlar) o[s.k] = s.v;
  return o;
}

export async function GET() {
  if (!sql) return hata("storage", 500);
  try {
    await semaHazirla();
    return new Response(JSON.stringify(await tumIsaretler()), { headers: BASLIK });
  } catch {
    return hata("storage", 500);
  }
}

export async function POST(istek: Request) {
  if (!sql) return hata("storage", 500);
  try {
    await semaHazirla();

    const govde = (await istek.json().catch(() => null)) as { k?: unknown; v?: unknown } | null;
    const k = typeof govde?.k === "string" ? govde.k : "";
    const v = typeof govde?.v === "string" ? govde.v : "";

    if (!ANAHTAR_BICIMI.test(k) || !["yes", "no", ""].includes(v)) {
      return hata("bad request", 400);
    }

    if (v === "") {
      await sql`DELETE FROM pawlounge_marks WHERE k = ${k}`;
    } else {
      // Yeni anahtar eklerken sınırı kontrol et; mevcut anahtarın güncellenmesi serbest.
      const [{ sayi }] = (await sql`
        SELECT COUNT(*)::int AS sayi FROM pawlounge_marks
      `) as { sayi: number }[];
      const [mevcut] = (await sql`SELECT 1 FROM pawlounge_marks WHERE k = ${k}`) as unknown[];
      if (sayi >= AZAMI_KAYIT && !mevcut) return hata("bad request", 400);

      await sql`
        INSERT INTO pawlounge_marks (k, v, updated_at) VALUES (${k}, ${v}, NOW())
        ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v, updated_at = NOW()
      `;
    }

    return new Response(JSON.stringify(await tumIsaretler()), { headers: BASLIK });
  } catch {
    return hata("storage", 500);
  }
}
