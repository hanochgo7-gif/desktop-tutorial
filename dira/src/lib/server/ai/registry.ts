// AI tools → models and fixed instructions. There is deliberately no free-text prompt: every
// instruction forbids changing structure, size, windows, views and damage, per the editing policy.
// Model facts verified against Replicate model schemas (2026-11); re-check a slug before switching it.

export const AI_TOOLS = ["stage", "declutter", "refresh", "sky", "erase", "upscale"] as const;
export type AiToolId = (typeof AI_TOOLS)[number];

export const ROOMS = ["living", "bedroom", "kitchen", "dining", "office", "kids"] as const;
export const STYLES = ["modern", "scandinavian", "minimalist", "luxury", "mediterranean", "contemporary"] as const;
export type Room = (typeof ROOMS)[number];
export type Style = (typeof STYLES)[number];

const ROOM_EN: Record<Room, string> = {
  living: "living room",
  bedroom: "bedroom",
  kitchen: "kitchen",
  dining: "dining area",
  office: "home office",
  kids: "children's bedroom",
};

const STYLE_EN: Record<Style, string> = {
  modern: "modern style: clean-lined sofa and chairs, neutral palette with black accents, simple wood and metal",
  scandinavian: "Scandinavian style: light oak, white and soft grey textiles, wool rug, a few green plants",
  minimalist: "minimalist style: very few pieces, low profile furniture, warm white and beige, uncluttered surfaces",
  luxury: "upscale style: velvet or leather seating, marble and brass accents, layered lighting, refined decor",
  mediterranean: "Mediterranean style: natural linen, rattan and terracotta tones, light wood, olive and sand colours",
  contemporary: "contemporary style: comfortable modular seating, mixed textures, muted earth tones, current decor",
};

/** Rules appended to every generative instruction. */
const LOCK =
  "Treat the photo as the source of truth. Keep the exact camera position, perspective, framing and crop. " +
  "Keep every wall, window, door, opening, ceiling, floor, trim, built-in, fixture and appliance unchanged. " +
  "Do not add, remove, move or resize any window or door. Keep the view through every window exactly as it is. " +
  "Do not change room dimensions or proportions. Do not hide or repair any damage, damp stains, cracks or wear. " +
  "Do not add amenities that are not in the photo. Photorealistic real-estate photograph.";

export type ToolSpec = {
  model: string; // owner/name on Replicate
  /** Builds the provider input. `image` and `mask` are URLs (or data URIs in development). */
  input: (a: { image: string; mask?: string; room?: Room; style?: Style; pro: boolean }) => Record<string, unknown>;
  needsMask?: boolean;
};

const EDIT_MODEL = "google/nano-banana-2.1";

function edit(prompt: string, image: string, pro: boolean) {
  return {
    prompt,
    image_input: [image],
    aspect_ratio: "match_input_image",
    resolution: pro ? "4K" : "2K",
    output_format: "jpg",
    google_search: false,
    image_search: false,
  };
}

export const TOOLS: Record<AiToolId, ToolSpec> = {
  stage: {
    model: EDIT_MODEL,
    input: ({ image, room = "living", style = "modern", pro }) =>
      edit(
        `Virtually stage this empty ${ROOM_EN[room]} in ${STYLE_EN[style]}. Add only movable furniture, rugs, textiles, lamps and decor at realistic scale, ` +
          `with shadows that match the existing light. Keep doorways and walkways clear. ${LOCK}`,
        image,
        pro,
      ),
  },
  declutter: {
    model: EDIT_MODEL,
    input: ({ image, pro }) =>
      edit(
        "Remove only small temporary items: loose cables, chargers, papers, toiletries, toys, laundry, drying racks, magnets, bags, bins and personal belongings. " +
          "Keep all furniture, rugs, curtains, art, lamps and appliances exactly as they are. Fill removed areas with the surrounding surface. " +
          `Do not change lighting, colours, camera angle or crop. ${LOCK}`,
        image,
        pro,
      ),
  },
  refresh: {
    model: EDIT_MODEL,
    input: ({ image, pro }) =>
      edit(
        "Tidy this room for a listing photo: straighten bedding, pillows and throws, neaten items on surfaces, close cabinet doors, align chairs. " +
          `Keep every piece of furniture and every object that stays in the room; do not replace, restyle or add furniture. ${LOCK}`,
        image,
        pro,
      ),
  },
  sky: {
    model: EDIT_MODEL,
    input: ({ image, pro }) =>
      edit(
        "Replace only the sky with a clear daytime sky with a few soft clouds, and balance the daylight on the building to match. " +
          "Do not change the building, roofline, trees, landscaping, neighbouring buildings, street, cars or anything below the skyline. " +
          `Keep framing. ${LOCK}`,
        image,
        pro,
      ),
  },
  erase: {
    model: "bria/eraser",
    needsMask: true,
    // White pixels in the mask are removed.
    input: ({ image, mask }) => ({ image, mask }),
  },
  upscale: {
    model: "prunaai/p-image-upscale",
    input: ({ image }) => ({ image, upscale_mode: "factor", factor: 2, enhance_details: false, enhance_realism: false }),
  },
};
