import { notFound } from "next/navigation";
import { Fraunces } from "next/font/google";
import { Topbar } from "@/components/Topbar";
import { Ticker } from "@/components/Ticker";
import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";
import { LOCALES, isLocale } from "@/lib/i18n";
import { getDispatches } from "@/lib/dispatches";

const fraunces = Fraunces({
  subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"],
  variable: "--font-fraunces", display: "swap",
});

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children, params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const ticker = (await getDispatches(locale, 6)).map((d) => ({ title: d.title, slug: d.slug }));

  return (
    <html lang={locale} className={`${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <Topbar locale={locale} />
        <Ticker items={ticker} locale={locale} />
        <Masthead locale={locale} />
        {children}
        <Footer locale={locale} />
      </body>
    </html>
  );
}
