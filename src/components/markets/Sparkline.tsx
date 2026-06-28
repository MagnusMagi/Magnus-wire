// Bağımsız, sıfır-bağımlılık SVG sparkline. up=true → teal (wire), false → signal.
// baseline (önceki kapanış) verilirse kesik referans çizgisi çizilir.
export function Sparkline({ data, up, baseline }: { data: number[]; up: boolean; baseline?: number }) {
  if (!data || data.length < 2) return <div className="h-[34px]" aria-hidden />;
  const w = 132, h = 34, pad = 3;
  const all = baseline != null ? [...data, baseline] : data;
  const min = Math.min(...all), max = Math.max(...all);
  const range = max - min || 1;
  const x = (i: number) => pad + (i / (data.length - 1)) * (w - 2 * pad);
  const y = (v: number) => pad + (1 - (v - min) / range) * (h - 2 * pad);
  const line = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;
  const color = up ? "var(--color-wire)" : "var(--color-signal)";
  const id = `spk-${up ? "u" : "d"}`;
  const baseY = baseline != null ? y(baseline) : null;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[34px]" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.20" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      {baseY != null && (
        <line x1={pad} y1={baseY} x2={w - pad} y2={baseY} stroke="var(--color-ink-3)" strokeWidth="0.75" strokeDasharray="2 2" opacity="0.7" vectorEffect="non-scaling-stroke" />
      )}
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
