"use client";
import { useRef, useState } from "react";
import { formatPrice, type Quote } from "@/lib/markets";
import type { Locale } from "@/lib/i18n";

export type ChartType = "area" | "line" | "candle";
type Pt = { t: number | null; c: number; o?: number | null; h?: number | null; l?: number | null };

const UP = "var(--color-wire)";
const DOWN = "var(--color-signal)";

export function PriceChart({ points, up, type, quote, locale, currency, range }: {
  points: Pt[]; up: boolean; type: ChartType; quote: Quote; locale: Locale; currency: string; range: string;
}) {
  const [hi, setHi] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  if (!points || points.length < 2)
    return <div className="h-[200px] grid place-items-center font-mono text-xs text-ink-3">—</div>;

  const w = 600, h = 200, pad = 6;
  const candle = type === "candle" && points.some((p) => p.o != null && p.h != null && p.l != null);
  const vals = candle
    ? points.flatMap((p) => [p.h ?? p.c, p.l ?? p.c])
    : points.map((p) => p.c);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const X = (i: number) => pad + (i / (points.length - 1)) * (w - 2 * pad);
  const Y = (v: number) => pad + (1 - (v - min) / span) * (h - 2 * pad);
  const lineColor = up ? UP : DOWN;

  const linePts = points.map((p, i) => `${X(i).toFixed(1)},${Y(p.c).toFixed(1)}`).join(" ");
  const areaPts = `${pad},${h - pad} ${linePts} ${w - pad},${h - pad}`;
  const cw = Math.max(1.2, ((w - 2 * pad) / points.length) * 0.62);

  const onMove = (clientX: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rel = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setHi(Math.round(rel * (points.length - 1)));
  };

  const tag = locale === "tr" ? "tr-TR" : locale === "et" ? "et-EE" : "en-GB";
  const fmtVal = (v: number) => formatPrice({ ...quote, price: v, currency }, locale);
  const fmtTime = (t: number | null) => {
    if (t == null) return "";
    const intraday = range === "1d" || range === "5d";
    return new Intl.DateTimeFormat(tag, intraday
      ? { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Istanbul" }
      : { day: "2-digit", month: "short", year: "2-digit", timeZone: "Europe/Istanbul" }
    ).format(new Date(t * 1000));
  };

  const sel = hi != null ? points[hi] : null;
  const leftPct = hi != null ? (X(hi) / w) * 100 : 0;

  return (
    <div
      ref={wrapRef}
      className="relative select-none touch-none cursor-crosshair"
      onPointerMove={(e) => onMove(e.clientX)}
      onPointerDown={(e) => onMove(e.clientX)}
      onPointerLeave={() => setHi(null)}
    >
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[200px] block" preserveAspectRatio="none" aria-hidden>
        {!candle && (
          <defs>
            <linearGradient id="pc-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.18" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>
        )}

        {type === "area" && !candle && <polygon points={areaPts} fill="url(#pc-grad)" />}

        {!candle && (
          <polyline points={linePts} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        )}

        {candle && points.map((p, i) => {
          if (p.o == null || p.h == null || p.l == null) return null;
          const x = X(i);
          const cu = p.c >= p.o;
          const col = cu ? UP : DOWN;
          const yTop = Math.min(Y(p.o), Y(p.c));
          const bodyH = Math.max(0.8, Math.abs(Y(p.c) - Y(p.o)));
          return (
            <g key={i}>
              <line x1={x} y1={Y(p.h)} x2={x} y2={Y(p.l)} stroke={col} strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <rect x={x - cw / 2} y={yTop} width={cw} height={bodyH} fill={col} />
            </g>
          );
        })}

        {sel && (
          <>
            <line x1={X(hi as number)} y1={pad} x2={X(hi as number)} y2={h - pad} stroke="var(--color-ink-3)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            <circle cx={X(hi as number)} cy={Y(sel.c)} r="3.5" fill={up ? UP : DOWN} stroke="var(--color-paper)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>
      {sel && (
        <div
          className="absolute -top-1 pointer-events-none font-mono text-[11px] bg-ink text-paper px-2 py-1 whitespace-nowrap tabular-nums shadow-sm"
          style={{ left: `clamp(0px, calc(${leftPct}% - 46px), calc(100% - 96px))` }}
        >
          <span className="font-bold">{fmtVal(sel.c)}</span>
          {sel.t != null && <span className="text-[#9b978c] ml-2">{fmtTime(sel.t)}</span>}
        </div>
      )}
    </div>
  );
}
