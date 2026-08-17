// .env.local'i elle parse eder — script'ler PM2/Next dışında, çıplak node ile
// (cron'dan) koştuğu için process.env hazır gelmiyor.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));

export function loadEnv() {
  try {
    const txt = readFileSync(join(__dir, "..", ".env.local"), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {}
}

// Eksik env ile sessizce yanlış davranmaktansa hemen düş.
export function requireEnv(...keys) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`HATA eksik env: ${missing.join(", ")}`);
    process.exit(1);
  }
  return keys.map((k) => process.env[k]);
}
