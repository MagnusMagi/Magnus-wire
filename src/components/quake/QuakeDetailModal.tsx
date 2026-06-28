"use client";
import { useEffect } from "react";
import { magInfo, depthLabel, type Quake } from "@/lib/quake";
import { t, type Locale } from "@/lib/i18n";

function fmt(ms: number, l: Locale): string {
  const tag = l === "tr" ? "tr-TR" : l === "et" ? "et-EE" : "en-GB";
  try {
    return new Intl.DateTimeFormat(tag, {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      hour12: false, timeZone: "Europe/Istanbul",
    }).format(new Date(ms));
  } catch {
    return "—";
  }
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-paper px-3 py-2.5">
      <div className="font-mono text-[9.5px] font-bold uppercase tracking-widest text-ink-3">{label}</div>
      <div className="font-mono text-[13px] font-bold tabular-nums mt-0.5 flex items-center gap-1.5">
        {color && <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />}
        <span>{value}</span>
      </div>
    </div>
  );
}

export function QuakeDetailModal({ q, locale, onClose }: { q: Quake; locale: Locale; onClose: () => void }) {
  const { label, color } = magInfo(q.mag, locale);
  const d = 0.8;
  const bbox = `${q.lon - d},${q.lat - d / 2},${q.lon + d},${q.lat + d / 2}`;
  const map = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${q.lat},${q.lon}`;
  const osm = `https://www.openstreetmap.org/?mlat=${q.lat}&mlon=${q.lon}#map=8/${q.lat}/${q.lon}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={q.place} onClick={onClose}
      className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-6">
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-[600px] bg-paper border-2 border-ink max-h-[92vh] overflow-y-auto wire-printin">
        {/* Başlık */}
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-line">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex-none grid place-items-center w-[56px] h-[56px] font-serif text-[25px] font-black tabular-nums text-paper"
              style={{ background: color }}>{q.mag.toFixed(1)}</span>
            <div className="min-w-0">
              <h3 className="font-serif text-[22px] font-black tracking-tight leading-tight truncate">{q.place}</h3>
              <div className="font-mono text-[11px] font-bold uppercase tracking-wide" style={{ color }}>{label}</div>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="font-mono text-[22px] leading-none text-ink-2 hover:text-signal px-1">×</button>
        </div>

        {/* Harita */}
        <div className="relative border-b border-line">
          <span className="absolute top-2 left-2 z-10 font-mono text-[10px] font-bold uppercase tracking-widest text-paper bg-ink/80 px-2 py-1">{t(locale, "quakeMap")}</span>
          <iframe title={t(locale, "quakeMap")} loading="lazy" src={map} className="w-full h-[260px] block" />
        </div>

        {/* Ölçümler */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-line m-5 border border-line">
          <Stat label={t(locale, "quakeMagnitude")} value={q.mag.toFixed(1)} color={color} />
          <Stat label={t(locale, "quakeDepth")} value={q.depth != null ? `${q.depth.toFixed(1)} km` : "—"} />
          <Stat label={t(locale, "quakeDepthClass")} value={depthLabel(q.depth, locale)} />
          <Stat label={t(locale, "quakeWhen")} value={fmt(q.time, locale)} />
          <Stat label={t(locale, "quakeCoords")} value={`${q.lat.toFixed(2)}, ${q.lon.toFixed(2)}`} />
          {q.region && <Stat label={t(locale, "quakeNearest")} value={q.region} />}
        </div>

        <div className="px-5 pb-5 flex flex-wrap items-center gap-3">
          <a href={q.url || osm} target="_blank" rel="noopener noreferrer"
            className="font-mono text-[11px] font-bold uppercase tracking-wide border border-ink px-3 py-1.5 hover:bg-ink hover:text-paper transition-colors">
            {q.url ? "USGS →" : t(locale, "quakeOnMap")}
          </a>
          <span className="font-mono text-[10px] text-ink-3">{t(locale, "quakeSource")}</span>
        </div>
      </div>
    </div>
  );
}
