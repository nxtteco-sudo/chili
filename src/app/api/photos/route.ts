import { savePhotoFile } from "@/lib/store";

const MAX_BYTES = 5 * 1024 * 1024;

// The browser shrinks photos to JPEG before uploading (see photo-picker.tsx),
// so anything that isn't a JPEG is rejected.
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No photo received" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Photo is too large (max 5 MB)" }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (!isJpeg) return Response.json({ error: "Only photos (JPEG) can be uploaded" }, { status: 415 });

  const id = await savePhotoFile(bytes);
  return Response.json({ id, url: `/photos/${id}` });
}
