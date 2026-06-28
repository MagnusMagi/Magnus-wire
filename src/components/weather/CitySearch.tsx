"use client";
import { useEffect, useRef, useState } from "react";
import { t, type Locale } from "@/lib/i18n";
import type { SavedCity } from "./useCities";

type Hit = { id: string; name: string; country: string; admin1: string; lat: number; lon: number };

export function CitySearch({ onAdd, locale }: { onAdd: (c: SavedCity) => void; locale: Locale }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const id = setTimeout(() => {
      fetch(`/api/geocode?q=${encodeURIComponent(q.trim())}&lang=${locale}`)
        .then((r) => r.json())
        .then((d) => { setHits(d.results || []); setOpen(true); })
        .catch(() => setHits([]));
    }, 300);
    return () => clearTimeout(id);
  }, [q, locale]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (h: Hit) => { onAdd({ id: h.id, name: h.name, lat: h.lat, lon: h.lon }); setQ(""); setHits([]); setOpen(false); };

  return (
    <div ref={boxRef} className="relative max-w-[320px]">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => hits.length && setOpen(true)}
        placeholder={t(locale, "cityPlaceholder")}
        className="w-full font-mono text-[12px] bg-paper border border-line focus:border-ink outline-none px-3 py-2"
      />
      {open && hits.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 mt-1 bg-paper border border-ink max-h-[220px] overflow-y-auto shadow-md">
          {hits.map((h) => (
            <li key={h.id}>
              <button type="button" onClick={() => pick(h)}
                className="w-full text-left px-3 py-2 font-mono text-[12px] hover:bg-panel flex justify-between gap-2">
                <span className="font-bold truncate">{h.name}</span>
                <span className="text-ink-3 whitespace-nowrap">{[h.admin1, h.country].filter(Boolean).join(", ")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
