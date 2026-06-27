export function ContactForm() {
  return (
    <div className="mt-9">
      <h2 className="font-serif text-[25px] font-semibold tracking-tight mb-3.5">Bize yazın</h2>
      <form className="flex flex-col gap-3" action="#">
        <label htmlFor="ad" className="font-mono text-[11px] font-bold uppercase tracking-wide">Ad Soyad</label>
        <input id="ad" type="text" placeholder="Adınız" className="font-mono text-sm px-3.5 py-2.5 border border-line bg-[#fbfaf6] text-ink outline-none focus:border-ink" />
        <label htmlFor="eposta" className="font-mono text-[11px] font-bold uppercase tracking-wide">E-posta</label>
        <input id="eposta" type="email" placeholder="ornek@eposta.com" className="font-mono text-sm px-3.5 py-2.5 border border-line bg-[#fbfaf6] text-ink outline-none focus:border-ink" />
        <label htmlFor="mesaj" className="font-mono text-[11px] font-bold uppercase tracking-wide">Mesaj</label>
        <textarea id="mesaj" placeholder="Mesajınızı yazın…" className="font-mono text-sm px-3.5 py-2.5 border border-line bg-[#fbfaf6] text-ink outline-none focus:border-ink resize-y min-h-[120px]" />
        <button type="submit" className="self-start font-mono text-[13px] font-bold tracking-wide uppercase px-5.5 py-2.5 border border-signal bg-signal text-white hover:bg-signal-d transition-colors">Gönder</button>
      </form>
      <p className="font-mono text-[11.5px] text-ink-3 mt-6">Bu bir prototiptir; form gönderimi henüz aktif değildir.</p>
    </div>
  );
}
