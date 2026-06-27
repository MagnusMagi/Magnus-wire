import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Magnus Wire",
    short_name: "WIRE",
    description: "Teknolojinin ve bölgenin canlı tel servisi — TR/EN/ET.",
    start_url: "/tr",
    scope: "/",
    display: "standalone",
    background_color: "#edebe4",
    theme_color: "#1a1916",
    lang: "tr",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
