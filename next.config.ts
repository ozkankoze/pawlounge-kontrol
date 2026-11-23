import type { NextConfig } from "next";

/**
 * Kontrol sayfası hazır bir HTML dosyası (public/index.html) ve içindeki
 * betik işaretleri "api.php" adresine gönderiyor. Sayfanın kendisine hiç
 * dokunmamak için o iki yolu burada yönlendiriyoruz.
 */
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/", destination: "/index.html" },
      { source: "/api.php", destination: "/api/marks" },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
