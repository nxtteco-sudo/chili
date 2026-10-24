"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, LoaderCircle, TriangleAlert, X } from "lucide-react";
import type { Photo } from "@/lib/types";
import { PhotoTile } from "./photo-tile";

const MAX_SIDE = 1600;

// Phone photos are 3–8 MB; shrinking to 1600px JPEG keeps them ~200–400 KB.
async function toJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.82),
  );
}

type Upload = {
  key: number;
  preview: string;
  status: "uploading" | "done" | "error";
  id?: string;
  error?: string;
};

export function PhotoPicker({ existing = [], error }: { existing?: Photo[]; error?: string }) {
  const [kept, setKept] = useState(existing);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const nextKey = useRef(0);
  const previews = useRef(new Set<string>());

  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const patch = (key: number, p: Partial<Upload>) =>
    setUploads((list) => list.map((u) => (u.key === key ? { ...u, ...p } : u)));

  async function add(files: FileList | null) {
    for (const file of Array.from(files ?? [])) {
      const key = nextKey.current++;
      const preview = URL.createObjectURL(file);
      previews.current.add(preview);
      setUploads((list) => [...list, { key, preview, status: "uploading" }]);
      try {
        const jpeg = await toJpeg(file).catch(() => {
          throw new Error("Can't read this photo. Try a JPG or PNG.");
        });
        const body = new FormData();
        body.append("file", jpeg, "photo.jpg");
        const res = await fetch("/api/photos", { method: "POST", body });
        const json = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
        if (!res.ok || !json.id) throw new Error(json.error ?? "Upload failed. Check the internet and try again.");
        patch(key, { status: "done", id: json.id });
      } catch (e) {
        patch(key, { status: "error", error: (e as Error).message });
      }
    }
  }

  function removeUpload(u: Upload) {
    URL.revokeObjectURL(u.preview);
    previews.current.delete(u.preview);
    setUploads((list) => list.filter((x) => x.key !== u.key));
  }

  const busy = uploads.some((u) => u.status === "uploading");

  return (
    <div>
      {kept.map((p) => (
        <input key={p.id} type="hidden" name="keepPhotoIds" value={p.id} />
      ))}
      {uploads.map((u) => u.status === "done" && <input key={u.key} type="hidden" name="newPhotoIds" value={u.id} />)}
      {busy && <input type="hidden" name="uploading" value="true" />}

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {kept.map((p) => (
          <div key={p.id} className="relative aspect-square">
            <PhotoTile photo={p} showCaption={false} className="size-full" />
            <RemoveButton onClick={() => setKept((k) => k.filter((x) => x.id !== p.id))} />
          </div>
        ))}
        {uploads.map((u) => (
          <div key={u.key} className="relative aspect-square overflow-hidden rounded-xl bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img src={u.preview} alt="" className="size-full object-cover" />
            {u.status === "uploading" && (
              <div className="absolute inset-0 grid place-items-center bg-black/40 text-white">
                <LoaderCircle className="size-6 animate-spin" />
              </div>
            )}
            {u.status === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-problem/85 p-2 text-center text-xs text-white">
                <TriangleAlert className="size-5" />
                {u.error}
              </div>
            )}
            <RemoveButton onClick={() => removeUpload(u)} />
          </div>
        ))}
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line bg-surface text-sm text-ink-2 transition-colors hover:bg-surface-2">
          <Camera className="size-6 text-muted" />
          Add photo
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              add(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {error && <p className="mt-1.5 text-sm text-problem">{error}</p>}
    </div>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Remove photo"
      className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/60 text-white"
    >
      <X className="size-4" />
    </button>
  );
}
