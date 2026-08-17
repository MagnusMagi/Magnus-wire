import { cookies } from "next/headers";
import { clientIp, rateLimited } from "@/lib/ratelimit";
import { ADMIN_COOKIE, checkPassword, createSessionToken, SESSION_MAX_AGE_SECONDS } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (rateLimited(`admin-login:${ip}`, 5, 60_000)) {
    return Response.json({ error: "rate" }, { status: 429 });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad" }, { status: 400 });
  }

  const password = (body.password || "").slice(0, 200);
  if (!checkPassword(password)) {
    return Response.json({ error: "invalid" }, { status: 401 });
  }

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return Response.json({ ok: true });
}
