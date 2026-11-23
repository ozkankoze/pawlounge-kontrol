# Paw Lounge · Ürün Görseli Kontrolü

Paw Lounge'un 2.871 ürünü için görsel eşleştirme kontrol aracı. Kontrol eden
kişi her ürüne "doğru / yanlış" işaretler, işaretler sunucuda saklanır.

Yayın adresi: **pawlounge.medya333.com**

## Özgün araçtan farkı

Araç önce klasik PHP hosting için yazılmıştı (`api.php` + `data/marks.json`).
Vercel'de PHP yok ve dosya sistemi salt okunur, bu yüzden iki şey değişti:

| Eski | Yeni |
|---|---|
| `api.php` | `src/app/api/marks/route.ts` (aynı sözleşme) |
| `data/marks.json` | Postgres'te `pawlounge_marks` tablosu |
| — | `middleware.ts` ile tek şifreli kapı |

**`public/index.html` dosyasına hiç dokunulmadı.** Sayfanın kendi betiği
işaretleri `api.php` adresine gönderiyor; `next.config.ts` o yolu yeni uca
yönlendiriyor. Araç birebir eskisi gibi çalışıyor.

## Ortam değişkenleri

İkisi de Vercel → Settings → Environment Variables altında tanımlanır.

| Değişken | Ne işe yarar |
|---|---|
| `KONTROL_SIFRE` | Sayfayı açarken sorulan parola. **Tanımlı değilse sayfa açılmaz** (503) — yanlışlıkla herkese açık yayına çıkmasın diye bilerek böyle. |
| `DATABASE_URL` | Neon Postgres bağlantısı. medya333web projesindeki değerin aynısı kullanılabilir; tablo ayrı (`pawlounge_marks`), mevcut verilere dokunmaz. |

`DATABASE_URL` yoksa sayfa yine açılır ama işaretler yalnızca o tarayıcıda
(localStorage) kalır; sayfa bunu üstte açıkça yazar.

## Tablo

İlk istekte kendiliğinden oluşur, ayrı bir migration yok:

```sql
CREATE TABLE pawlounge_marks (
  k          TEXT PRIMARY KEY,   -- stok kodu
  v          TEXT NOT NULL,      -- 'yes' | 'no'
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
```

İşaretleri dökmek için:

```sql
SELECT k, v, updated_at FROM pawlounge_marks ORDER BY updated_at DESC;
```

Sayfadaki **Dışa aktar** düğmesi de aynı listeyi metin olarak verir.

## Bilinen sınır

Ürün görselleri rakip/tedarikçi sitelerinden doğrudan çağrılıyor
(evcilsepetim, alomama, petlebi, petihtiyac, myikas CDN vb.). Bu siteler
dış bağlantıyı engellerse ilgili görsel yüklenmez; sayfa o kutuda uyarı
gösterir, kontrol eden kişi yanındaki Google görsel arama bağlantısından
devam edebilir. Araç buna göre tasarlanmış, bozulma değil.

## Geliştirme

```
npm install
KONTROL_SIFRE=test1234 npm run dev
```
