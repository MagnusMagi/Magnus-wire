import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: ["https://news.magnusmagi.com/sitemap.xml", "https://news.magnusmagi.com/news-sitemap.xml"],
  };
}
