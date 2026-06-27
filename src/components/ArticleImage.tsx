"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

// Hero görselleri harici kaynaktan (RSS / crawl'lanan og:image) doğrudan gelir;
// bazı siteler hotlink'i 403/404 ile engeller. Yüklenmezse gri picsum'a düşeriz.
export function ArticleImage({
  hero, slug, alt = "", ratio = "aspect-[4/3]",
}: {
  hero?: string | null; slug: string; alt?: string; ratio?: string;
}) {
  const fallback = `https://picsum.photos/seed/${encodeURIComponent(slug)}/1200/900?grayscale`;
  const [src, setSrc] = useState(hero || fallback);
  return (
    <div className={`${ratio} overflow-hidden border border-line bg-panel`}>
      <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer"
        onError={() => { if (src !== fallback) setSrc(fallback); }}
        className="w-full h-full object-cover grayscale contrast-[1.03] transition-[filter] duration-700 hover:grayscale-0" />
    </div>
  );
}
