"use client";
import Link from "next/link";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-[680px] px-6 py-24 text-center">
      <div className="font-mono text-[13px] font-bold uppercase tracking-[0.3em] text-signal mb-4">hata · parazit</div>
      <h1 className="font-serif font-black text-[clamp(36px,7vw,68px)] leading-none mb-5">Bir aksaklık oldu.</h1>
      <p className="text-ink-2 text-[15px] mb-8">Tel masasında geçici bir parazit. Tekrar deneyin ya da akışa dönün.</p>
      <div className="flex gap-3 justify-center">
        <button type="button" onClick={reset} className="font-mono text-xs font-bold uppercase tracking-widest px-5 py-3 bg-ink text-paper hover:bg-signal transition-colors">Tekrar dene</button>
        <Link href="/tr" className="font-mono text-xs font-bold uppercase tracking-widest px-5 py-3 border border-ink hover:border-signal hover:text-signal transition-colors">Akışa dön</Link>
      </div>
    </main>
  );
}
