// Script'ler için Postgres istemcisi (src/lib/db.ts'nin eşi; tipler aynı:
// timestamptz → ISO string, bigint → number). Neon pooler prepared statement
// taşımadığı için prepare:false.
import postgres from "postgres";

export function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("HATA eksik env: DATABASE_URL"); process.exit(1); }
  return postgres(url, {
    prepare: false,
    max: 4,
    idle_timeout: 20,
    connect_timeout: 10,
    types: {
      bigint: { to: 20, from: [20], serialize: (x) => String(x), parse: (x) => Number(x) },
      timestamptz: {
        to: 1184, from: [1184, 1114],
        serialize: (x) => (x instanceof Date ? x.toISOString() : x),
        parse: (x) => new Date(x).toISOString(),
      },
    },
  });
}

// `on conflict (...) do update set` gövdesi: verilen kolonları excluded'dan
// alır. Kolon adları koddan gelir (kullanıcı girdisi değil); yine de yalnız
// [a-z_] kabul edilir.
export function excludedSet(sql, keys) {
  for (const k of keys) if (!/^[a-z_]+$/.test(k)) throw new Error(`geçersiz kolon: ${k}`);
  return sql.unsafe(keys.map((k) => `"${k}" = excluded."${k}"`).join(", "));
}

// Satır kümesinin ortak kolonları (anahtar hariç) — toplu upsert için.
export function updateKeys(rows, conflictKey) {
  return Object.keys(rows[0]).filter((k) => k !== conflictKey);
}
