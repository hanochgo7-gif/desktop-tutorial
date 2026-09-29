import { imageModel, imageSettings } from "../defaults"

// docs.higgsfield.ai/docs/models/recraft-v4-1/text-to-image: text only, 1k only, no "auto".
const RECRAFT_ASPECT = [
  "1:1",
  "2:1",
  "1:2",
  "3:2",
  "2:3",
  "4:3",
  "3:4",
  "5:4",
  "4:5",
  "6:10",
  "14:10",
  "10:14",
  "16:9",
  "9:16",
] as const

export default imageModel(
  "recraft-4.1",
  "Recraft 4.1",
  { text: "recraft/v4.1/text-to-image" },
  {
    icon: "recraft",
    order: 43,
    roles: {},
    settings: imageSettings(RECRAFT_ASPECT, ["1k"]),
  }
)
