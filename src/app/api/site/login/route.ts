import { cookies } from "next/headers";
import { clientIp, rateLimited } from "@/lib/ratelimit";
import { SITE_COOKIE, checkSitePassword, createSiteSessionToken, SITE_SESSION_MAX_AGE_SECONDS } from "@/lib/siteGateAuth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (rateLimited(`site-login:${ip}`, 5, 60_000)) {
    return Response.json({ error: "rate" }, { status: 429 });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad" }, { status: 400 });
  }

  const password = (body.password || "").slice(0, 200);
  if (!checkSitePassword(password)) {
    return Response.json({ error: "invalid" }, { status: 401 });
  }

  const jar = await cookies();
  jar.set(SITE_COOKIE, await createSiteSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SITE_SESSION_MAX_AGE_SECONDS,
  });

  return Response.json({ ok: true });
}
