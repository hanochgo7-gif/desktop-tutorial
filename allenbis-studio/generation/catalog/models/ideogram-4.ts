import { imageModel } from "../defaults"
import { urls } from "../mappers"

// docs.higgsfield.ai/docs/models/ideogram-4/generate: no resolution field,
// one optional image_url reference, rendering_speed TURBO/DEFAULT/QUALITY.
const IDEOGRAM_ASPECT = [
  "1:1",
  "1:2",
  "2:1",
  "2:3",
  "3:2",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "5:8",
  "8:5",
  "3:4",
  "4:3",
  "9:22",
  "22:9",
  "9:23",
  "23:9",
  "3:8",
  "8:3",
  "5:12",
  "12:5",
  "1:3",
  "3:1",
] as const

export default imageModel(
  "ideogram-4",
  "Ideogram 4.0",
  { text: "ideogram/v4.0" },
  {
    icon: "ideogram",
    order: 42,
    roles: { reference: 1 },
    settings: {
      aspectRatio: { type: "enum", values: IDEOGRAM_ASPECT, default: "1:1" },
      renderingSpeed: {
        type: "enum",
        values: ["TURBO", "DEFAULT", "QUALITY"],
        default: "DEFAULT",
      },
    },
    toPlatform: (plane) => {
      const [image] = urls(plane, "reference")
      return {
        path: "ideogram/v4.0",
        body: {
          prompt: plane.prompt.text,
          aspect_ratio: plane.settings.aspectRatio,
          rendering_speed: plane.settings.renderingSpeed,
          ...(image ? { image_url: image } : {}),
        },
      }
    },
  }
)
