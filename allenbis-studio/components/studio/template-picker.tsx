/* eslint-disable @next/next/no-img-element */
"use client"

import type { KeyboardEvent, ReactNode } from "react"
import {
  Bike,
  Clapperboard,
  CupSoda,
  Popcorn,
  Tag,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import type { MediaRole } from "@/generation/catalog/types"
import { cn } from "@/lib/utils"

/**
 * Templates — the "what you can make" examples. A `TemplateItem` seeds the
 * prompt dock (prompt text + optional model/settings/reference images) when
 * its Try action fires. `TemplateCard` and `ExamplePresets` render them; the
 * Explore tab on Home uses `ExamplePresets`.
 */

// Allenbis brand media: the store's own hero art and product photos.
const ART = {
  hero: "/presets/allenbis-hero.webp",
  shop: "/presets/allenbis-shop.webp",
  courier: "/presets/allenbis-courier.webp",
  sign: "/presets/allenbis-sign.webp",
  icons: "/presets/allenbis-icons.webp",
  deals: "/presets/allenbis-deals.webp",
  cola: "/presets/product-p1.webp",
  colaLarge: "/presets/product-p3.webp",
  bamba: "/presets/product-p42.webp",
  cornetto: "/presets/product-p92.webp",
  nuts: "/presets/product-p111.webp",
} as const

/** A same-origin image attached to the dock when the template is used. */
export interface TemplateReference {
  src: string
  name: string
  role: MediaRole
}

export interface TemplateItem {
  id: string
  title: string
  subtitle: string
  /** Free-form filter category used by the picker tabs. */
  category: string
  kind: "image" | "video"
  images: [string, string, string]
  icon: LucideIcon
  /** What the Try action puts in the dock. */
  prompt: string
  /** Catalog model id to switch to, when the template needs a specific one. */
  modelId?: string
  settings?: Record<string, unknown>
  /** Brand images uploaded and attached as references when the template is used. */
  references?: TemplateReference[]
}

const HERO_REFERENCE: TemplateReference = {
  src: ART.hero,
  name: "allenbis-hero.webp",
  role: "reference",
}

export const TEMPLATES: TemplateItem[] = [
  {
    id: "category-icon",
    title: "Category icon",
    subtitle: "Glossy 3D tile for the store's category grid",
    category: "store",
    kind: "image",
    images: [ART.icons, ART.cola, ART.bamba],
    icon: CupSoda,
    modelId: "recraft-4.1",
    settings: { aspectRatio: "1:1" },
    prompt:
      "3D emoji-style icon of two soda bottles and a can with water droplets, glossy soft clay render like Microsoft Fluent 3D emoji, small centered cluster, no text, no brand logos or labels, soft studio light, gentle shadow, pure white background, accents of royal blue #1B4396 and warm yellow #FFD84D.",
  },
  {
    id: "bundle-cover",
    title: "Bundle cover",
    subtitle: "Movie night, with the Allenbis mascot",
    category: "store",
    kind: "image",
    images: [ART.shop, ART.hero, ART.colaLarge],
    icon: Popcorn,
    modelId: "grok-imagine-2",
    settings: { aspectRatio: "16:9" },
    references: [HERO_REFERENCE],
    prompt:
      "Same 3D Pixar-like style and same character as the reference image: a friendly boy in a blue cap and blue t-shirt on a couch at night watching TV, bowls of puffed peanut snacks and a big bottle of cola on the table, warm cinematic light, wide shot, no text, no brand logos.",
  },
  {
    id: "courier-scene",
    title: "Courier on the way",
    subtitle: "Delivery-tracking art, same mascot",
    category: "store",
    kind: "image",
    images: [ART.courier, ART.sign, ART.hero],
    icon: Bike,
    modelId: "grok-imagine-2",
    settings: { aspectRatio: "16:9" },
    references: [HERO_REFERENCE],
    prompt:
      "Same 3D Pixar-like style and same character as the reference image: the boy riding an e-bike with a blue insulated delivery box on a sunny Tel Aviv street with palm trees and white Bauhaus buildings, motion blur, wide shot, no text.",
  },
  {
    id: "deal-banner",
    title: "Deal banner",
    subtitle: "Promo art in sign blue and shelf-tag yellow",
    category: "promo",
    kind: "image",
    images: [ART.deals, ART.cornetto, ART.nuts],
    icon: Tag,
    modelId: "qwen-image-3",
    settings: { aspectRatio: "16:9" },
    prompt:
      "Top-down studio flat-lay of snacks, soda bottles and ice cream bars on a royal blue #1B4396 background, one warm yellow #FFD84D price-tag shape, crisp soft shadows, empty space on the right for a headline, no text, no brand logos.",
  },
  {
    id: "hero-motion",
    title: "Animate the storefront",
    subtitle: "Short loop from the site's opening image",
    category: "promo",
    kind: "video",
    images: [ART.hero, ART.shop, ART.courier],
    icon: Clapperboard,
    modelId: "kling-3-turbo",
    references: [{ ...HERO_REFERENCE, role: "start" }],
    prompt:
      "The boy drops a snack bag into the shopping bag and smiles at the camera, shelves stay still, gentle slow camera push-in, soft store lighting, the courier on the right starts riding down the sunny street.",
  },
]

function gradientFromSeed(seed: string): string {
  let hash = 0
  for (const c of seed) hash = (hash * 31 + c.charCodeAt(0)) >>> 0
  const start = hash % 360
  const end = (start + 36 + ((hash >>> 8) % 72)) % 360
  return `linear-gradient(135deg, hsl(${start} 62% 52%) 0%, hsl(${end} 76% 27%) 100%)`
}

function GradientBadge({ as: Glyph, seed }: { as: LucideIcon; seed: string }) {
  return (
    <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-white/25 text-white shadow-[0_5px_3px_rgba(0,0,0,0.08),inset_0_3px_5px_rgba(255,255,255,0.24)]">
      <span
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundImage: gradientFromSeed(seed) }}
      />
      <span
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 mix-blend-overlay"
      />
      <Glyph className="relative size-5" />
    </span>
  )
}

const TRIPTYCH = [
  "rounded-l-2xl rounded-r-sm",
  "rounded-sm",
  "rounded-r-2xl rounded-l-sm",
] as const

export interface TemplateCardProps {
  template: TemplateItem
  variant?: "single" | "triptych"
  onTry: (template: TemplateItem) => void
  tryLabel?: ReactNode
}

export function TemplateCard({
  template,
  variant = "single",
  onTry,
  tryLabel = "Try",
}: TemplateCardProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.currentTarget !== event.target) return
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onTry(template)
    }
  }
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Use template: ${template.title}`}
      className="relative flex cursor-pointer flex-col gap-2 rounded-[20px] bg-white/5 p-2 shadow-[0_2px_6px_rgba(0,0,0,0.15)] transition-[transform,background-color] duration-200 hover:z-[1] hover:-translate-y-0.5 hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:hover:translate-y-0"
      onClick={() => onTry(template)}
      onKeyDown={onKeyDown}
    >
      <div className="flex h-60 items-stretch gap-1.5">
        {variant === "triptych" ? (
          template.images.map((src, i) => (
            <div
              key={i}
              className={cn(
                "min-w-0 flex-1 overflow-hidden border border-white/10",
                TRIPTYCH[i]
              )}
            >
              <img
                src={src}
                alt={`${template.title} — shot ${i + 1}`}
                className="size-full object-cover"
              />
            </div>
          ))
        ) : (
          <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/10">
            <img
              src={template.images[0]}
              alt={template.title}
              className="size-full object-cover"
            />
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 px-2 py-1">
        <GradientBadge as={template.icon} seed={template.id} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-foreground">
            {template.title}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {template.subtitle}
          </span>
        </div>
        <Button
          size="sm"
          className="rounded-full font-semibold"
          onClick={(event) => {
            event.stopPropagation()
            onTry(template)
          }}
        >
          {tryLabel}
        </Button>
      </div>
    </div>
  )
}

export interface ExamplePresetsProps {
  items: TemplateItem[]
  onUse: (template: TemplateItem) => void
  tryLabel?: ReactNode
  className?: string
}

/** The Explore grid: two columns of `TemplateCard`s. */
export function ExamplePresets({
  items,
  onUse,
  tryLabel = "Try",
  className = "w-full max-w-[900px]",
}: ExamplePresetsProps) {
  return (
    <div
      className={cn("grid w-full grid-cols-1 gap-5 sm:grid-cols-2", className)}
    >
      {items.map((t) => (
        <TemplateCard
          key={t.id}
          template={t}
          onTry={onUse}
          tryLabel={tryLabel}
        />
      ))}
    </div>
  )
}
