import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[680px] px-6 py-24 text-center">
      <div className="font-mono text-[13px] font-bold uppercase tracking-[0.3em] text-signal mb-4">404 · sinyal yok</div>
      <h1 className="font-serif font-black text-[clamp(40px,8vw,80px)] leading-none mb-5">Tel koptu.</h1>
      <p className="text-ink-2 text-[15px] mb-8 max-w-[46ch] mx-auto">Aradığınız dispatch arşivden düşmüş ya da hiç var olmamış olabilir. Akışa dönüp en güncel tellere göz atın.</p>
      <Link href="/tr" className="inline-block font-mono text-xs font-bold uppercase tracking-widest px-5 py-3 bg-ink text-paper hover:bg-signal transition-colors">← Akışa dön</Link>
    </main>
  );
}
