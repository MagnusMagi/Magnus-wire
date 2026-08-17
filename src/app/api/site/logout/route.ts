import { cookies } from "next/headers";
import { SITE_COOKIE } from "@/lib/siteGateAuth";

export const runtime = "nodejs";

export async function POST() {
  const jar = await cookies();
  jar.delete({ name: SITE_COOKIE, path: "/" });
  return Response.json({ ok: true });
}
