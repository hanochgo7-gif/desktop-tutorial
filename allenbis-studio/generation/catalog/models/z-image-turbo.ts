import { imageModel, imageSettings } from "../defaults"

// docs.higgsfield.ai/docs/models/z-image-turbo/generate: text only, 1k/2k, no "auto".
const Z_IMAGE_ASPECT = [
  "1:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "7:9",
  "9:7",
  "9:16",
  "16:9",
  "21:9",
] as const

export default imageModel(
  "z-image-turbo",
  "Z-Image Turbo",
  { text: "z-image/turbo" },
  {
    icon: "z-image",
    order: 45,
    roles: {},
    settings: imageSettings(Z_IMAGE_ASPECT, ["1k", "2k"]),
  }
)
