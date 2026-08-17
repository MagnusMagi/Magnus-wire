import { brandIcon } from "@/lib/brandIcon";

// Manifest ikonu. Next'in icon.tsx konvansiyonu tek boyut üretiyor; manifest
// için 192/512 ve maskable varyantı gerektiğinden ayrı rota olarak servis edilir.
export const runtime = "nodejs";
export const revalidate = 86400;

export function GET() {
  return brandIcon(512, 0.82);
}
