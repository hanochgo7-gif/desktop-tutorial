import { imageModel, imageSettings } from "../defaults"

// docs.higgsfield.ai/docs/models/grok-image-2/generate-and-edit: up to 10 image_urls, 1k/2k.
const GROK_ASPECT = [
  "auto",
  "1:1",
  "1:2",
  "2:1",
  "3:2",
  "2:3",
  "4:3",
  "3:4",
  "16:9",
  "9:16",
] as const

export default imageModel(
  "grok-imagine-2",
  "Grok Imagine 2.0",
  { text: "xai/grok-imagine-image-2.0" },
  {
    icon: "grok",
    order: 41,
    roles: { reference: 10 },
    settings: imageSettings(GROK_ASPECT, ["1k", "2k"]),
  }
)
