import { renderAppIcon } from "@/lib/app-icon";

export const ICON_SIZES = [32, 192, 512] as const;

export function generateImageMetadata() {
  return ICON_SIZES.map((s) => ({
    id: String(s),
    contentType: "image/png",
    size: { width: s, height: s },
  }));
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  return renderAppIcon(Number(await id));
}
