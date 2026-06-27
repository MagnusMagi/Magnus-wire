"use client";
import { useEffect, useState } from "react";

// Üstte signal renkli okuma ilerleme çubuğu ("canlı tel" nabzı).
export function ReadingProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setP(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 h-[3px] z-50 pointer-events-none" aria-hidden>
      <div className="h-full bg-signal" style={{ width: `${p}%` }} />
    </div>
  );
}
