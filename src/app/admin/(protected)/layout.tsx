import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/adminAuth";
import { LogoutButton } from "./LogoutButton";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const authed = verifySessionToken(jar.get(ADMIN_COOKIE)?.value);
  if (!authed) redirect("/admin/login");

  return (
    <div className="w-full max-w-5xl">
      <div className="flex items-center justify-between border-b-2 border-ink pb-3 mb-6">
        <span className="text-xs font-bold tracking-[0.08em] uppercase text-wire">
          MagiWire — Admin
        </span>
        <LogoutButton />
      </div>
      {children}
    </div>
  );
}
