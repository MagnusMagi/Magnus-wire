import { getQuakes } from "@/lib/quake";
import { QuakeFeed } from "./QuakeFeed";
import type { Locale } from "@/lib/i18n";

// Server: her iki kaynağı paralel çek, istemciye ver (kaynak değişimi anlık olsun).
export async function QuakeBoard({ locale }: { locale: Locale }) {
  const [kandilli, usgs] = await Promise.all([getQuakes("kandilli"), getQuakes("usgs")]);
  return (
    <section className="mb-10">
      <QuakeFeed
        locale={locale}
        initial={{
          kandilli: { quakes: kandilli.quakes, asOf: kandilli.asOf },
          usgs: { quakes: usgs.quakes, asOf: usgs.asOf },
        }}
      />
    </section>
  );
}
