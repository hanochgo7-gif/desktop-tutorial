import { z } from "zod";
import { HttpError, requireUser } from "@/lib/server/auth";
import { startJob } from "@/lib/server/ai/jobs";
import { AI_TOOLS, ROOMS, STYLES } from "@/lib/server/ai/registry";
import { sniffImage } from "@/lib/server/files";
import { handle, json } from "@/lib/server/http";
import { limit } from "@/lib/server/rate-limit";

export const maxDuration = 60;

const Fields = z.object({
  tool: z.enum(AI_TOOLS),
  room: z.enum(ROOMS).optional(),
  style: z.enum(STYLES).optional(),
  key: z.string().uuid(),
});

const MAX_IMAGE = 15 * 1024 * 1024;
const MAX_MASK = 5 * 1024 * 1024;

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser(req);
    limit("aiJob", user.id);
    const form = await req.formData().catch(() => null);
    if (!form) throw new HttpError(400, "bad_request");
    const parsed = Fields.safeParse({
      tool: form.get("tool"),
      room: form.get("room") || undefined,
      style: form.get("style") || undefined,
      key: form.get("key"),
    });
    if (!parsed.success) throw new HttpError(400, "bad_fields");
    const image = form.get("image");
    if (!(image instanceof File) || image.size === 0 || image.size > MAX_IMAGE) throw new HttpError(400, "bad_image");
    const imageBytes = new Uint8Array(await image.arrayBuffer());
    const imageType = sniffImage(imageBytes);
    if (!imageType) throw new HttpError(400, "bad_image");
    let mask: { data: Uint8Array; type: string } | undefined;
    const m = form.get("mask");
    if (m instanceof File && m.size > 0) {
      if (m.size > MAX_MASK) throw new HttpError(400, "bad_mask");
      const bytes = new Uint8Array(await m.arrayBuffer());
      if (sniffImage(bytes) !== "image/png") throw new HttpError(400, "bad_mask");
      mask = { data: bytes, type: "image/png" };
    }
    const job = await startJob(user, req, {
      tool: parsed.data.tool,
      room: parsed.data.room,
      style: parsed.data.style,
      image: { data: imageBytes, type: imageType },
      mask,
      idempotencyKey: parsed.data.key,
    });
    return json({ id: job.id, status: job.status }, 202);
  });
}
