import { brandIcon } from "@/lib/brandIcon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Kompozisyon src/lib/brandIcon.tsx'te — manifest ikonlarıyla tek kaynaktan.
export default function AppleIcon() {
  return brandIcon(size.width);
}
