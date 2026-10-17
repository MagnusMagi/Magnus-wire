import postgres from "postgres";

// Tek Postgres istemcisi (Neon pooled bağlantı). Supabase/PostgREST yerine
// doğrudan SQL: RLS yok, bu modül yalnız sunucu tarafında kullanılır.
//
// Tipler PostgREST'in döndürdüğüyle aynı tutuldu ki satır eşleyiciler
// değişmesin: timestamptz → ISO string, bigint → number.
type Sql = postgres.Sql<{ bigint: number }>;

const g = globalThis as unknown as { __newsSql?: Sql };

export function db(): Sql {
  if (g.__newsSql) return g.__newsSql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL tanımlı değil");
  g.__newsSql = postgres(url, {
    // Neon pooler (PgBouncer transaction modu) prepared statement taşımaz.
    prepare: false,
    max: Number(process.env.DATABASE_POOL_MAX || 5),
    idle_timeout: 20,
    connect_timeout: 10,
    types: {
      bigint: { to: 20, from: [20], serialize: (x: number) => String(x), parse: (x: string) => Number(x) },
      timestamptz: {
        to: 1184, from: [1184, 1114],
        serialize: (x: string | Date) => (x instanceof Date ? x.toISOString() : x),
        parse: (x: string) => new Date(x).toISOString(),
      },
    },
  }) as unknown as Sql;
  return g.__newsSql;
}
