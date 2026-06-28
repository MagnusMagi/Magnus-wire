import type { NextConfig } from "next";
import { withContentCollections } from "@content-collections/next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    // "finans" sayfası kaldırıldı; borsa yeterli. Eski bağlantıları/SEO'yu koru.
    return [
      { source: "/:locale(tr|en|et)/finans", destination: "/:locale/borsa", permanent: true },
      { source: "/finans", destination: "/tr/borsa", permanent: true },
    ];
  },
};

export default withContentCollections(nextConfig);
