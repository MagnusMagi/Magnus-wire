import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST() {
  const jar = await cookies();
  // path, login'dekiyle birebir aynı olmalı — yoksa çerez silinmez.
  jar.delete({ name: ADMIN_COOKIE, path: "/" });
  return Response.json({ ok: true });
}
