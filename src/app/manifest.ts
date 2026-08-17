import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MagiWire",
    short_name: "WIRE",
    description: "Teknolojinin ve bölgenin canlı tel servisi — TR/EN/ET.",
    start_url: "/tr",
    scope: "/",
    display: "standalone",
    background_color: "#edebe4",
    theme_color: "#1a1916",
    lang: "tr",
    // ⚠️ Android/Chrome kurulabilirliği için 192 ve 512 PNG ŞART; yalnız SVG +
    // 180px apple-icon vardı. Ayrıca "maskable" varyantı olmayınca Android
    // ikonu beyaz daire içine kutulayıp küçültüyordu — maskable sürümde logo
    // merkezdeki %80 güvenli alanda kalacak şekilde küçültülmüş durumda.
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
