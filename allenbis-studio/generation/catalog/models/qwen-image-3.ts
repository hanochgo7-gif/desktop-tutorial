import { imageModel, imageSettings } from "../defaults"

// docs.higgsfield.ai/docs/models/qwen-image-3/{text-to-image,edit}: references go to /edit (1–3).
const QWEN_ASPECT = [
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
  "qwen-image-3",
  "Qwen Image 3",
  {
    text: "alibaba/qwen-image-3/text-to-image",
    reference: "alibaba/qwen-image-3/edit",
  },
  {
    icon: "qwen",
    order: 44,
    roles: { reference: 3 },
    settings: imageSettings(QWEN_ASPECT, ["1k", "2k"]),
  }
)
