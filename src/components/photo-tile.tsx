import Image from "next/image";
import { Bug, Leaf, Sprout, Trees } from "lucide-react";
import { cn } from "@/lib/format";
import type { Photo } from "@/lib/types";
import { ChiliIcon } from "./chili-icon";

// Seeded demo photos have no file, so they get placeholder artwork.
const ART: Record<NonNullable<Photo["subject"]>, { bg: string; Icon: typeof Leaf }> = {
  leaf: { bg: "from-[#cfe6c3] to-[#8fbf7a] dark:from-[#2c4426] dark:to-[#1d2f19]", Icon: Leaf },
  fruit: { bg: "from-[#f6d3c4] to-[#e08a68] dark:from-[#4a2a1f] dark:to-[#2e1913]", Icon: ChiliIcon as typeof Leaf },
  pest: { bg: "from-[#e8e3cf] to-[#bdb38a] dark:from-[#3a3624] dark:to-[#25221a]", Icon: Bug },
  plant: { bg: "from-[#dbe8c8] to-[#a6b98a] dark:from-[#33402a] dark:to-[#20291a]", Icon: Sprout },
  field: { bg: "from-[#d5e3d0] to-[#8fae8a] dark:from-[#2a3a29] dark:to-[#1a2519]", Icon: Trees },
};

export function PhotoTile({
  photo,
  className,
  showCaption = true,
}: {
  photo: Photo;
  className?: string;
  showCaption?: boolean;
}) {
  const art = ART[photo.subject ?? "field"];
  return (
    <figure className={cn("relative overflow-hidden rounded-xl bg-surface-2", !photo.url && `bg-linear-to-br ${art.bg}`, className)}>
      {photo.url ? (
        <Image src={photo.url} alt={photo.caption || "Farm photo"} fill unoptimized sizes="400px" className="object-cover" />
      ) : (
        <>
          <div className="absolute inset-0 grid place-items-center">
            <art.Icon className="size-1/3 max-h-14 max-w-14 text-black/25 dark:text-white/25" />
          </div>
          <span className="absolute right-1.5 top-1.5 rounded bg-black/35 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
            Demo
          </span>
        </>
      )}
      {showCaption && photo.caption && (
        <figcaption className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent px-2.5 pb-2 pt-6 text-xs leading-snug text-white">
          {photo.caption}
        </figcaption>
      )}
    </figure>
  );
}

// Grid of photos; real photos open full size in a new tab.
export function PhotoGallery({ photos, className }: { photos: Photo[]; className?: string }) {
  if (photos.length === 0) return null;
  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3", className)}>
      {photos.map((ph) =>
        ph.url ? (
          <a key={ph.id} href={ph.url} target="_blank" rel="noreferrer" className="block">
            <PhotoTile photo={ph} className="aspect-square" />
          </a>
        ) : (
          <PhotoTile key={ph.id} photo={ph} className="aspect-square" />
        ),
      )}
    </div>
  );
}
