/**
 * Product catalogue — the single source of truth for the storefront,
 * the bag and the server-side checkout (prices are never trusted from the browser).
 *
 * The house: four fragrances, one per season, one flacon.
 *   N°01 Unforgettable (Autumn) — the flagship, verified from HG's own campaign.
 *   N°02 Open Window (Spring), N°03 Last Light (Summer), N°04 Nocturne (Winter) —
 *   new fragrance concepts. Their compositions are creative briefs to develop with a
 *   perfumer; they have no price and are not purchasable ("Coming soon") until
 *   formats and prices are set here. See LAUNCH.md.
 *
 * NOT yet verified — edit before launch:
 *   - Unforgettable: concentration, sizes, prices, notes (left empty on purpose)
 */

export type Season = 'Spring' | 'Summer' | 'Autumn' | 'Winter';

export interface Variant {
  id: string; // stable SKU-like id used in the bag
  label: string; // e.g. "100 ml"
  price: number; // in whole units of the site currency (e.g. 245 = $245)
  available: boolean;
}

export interface Still {
  name: string; // image master in src/assets/img
  alt: string;
  caption: string;
  wide?: boolean;
  focus?: string; // object-position when cropped to portrait
}

export interface Product {
  slug: string;
  number: string; // collection numbering, e.g. "N°01"
  name: string;
  season: Season;
  seasonOrder: number; // 1–4, spring → winter
  accent: string; // quiet seasonal accent for labels and rules
  concentration: string;
  shortLine: string;
  story: string[];
  bottle: string;
  notes: { top: string[]; heart: string[]; base: string[] } | null;
  status: 'available' | 'coming-soon';
  packshot: string; // product card + bag thumbnail
  gallery: { name: string; alt: string; focus?: string }[]; // product page gallery (first = hero)
  campaign: Still[]; // the season's campaign stills (shown on the product page when there are three)
  portrait: { name: string; alt: string; focus?: string }; // the model image beside the story
  storyTitle: string; // story heading; text after '|' is set in italics
  variants: Variant[];
}

export const products: Product[] = [
  {
    slug: 'unforgettable',
    number: 'N°01',
    name: 'Unforgettable',
    season: 'Autumn',
    seasonOrder: 3,
    accent: '#c8a66b',
    concentration: 'Eau de Parfum', // TODO(launch): confirm concentration
    shortLine: 'Leave the room. Stay in it.',
    story: [
      'It begins at the window: a city in the rain, a lamp left on, a man who is about to go.',
      'He wears it once, at the collar. Then he leaves. The door closes, the chair is empty, and the room keeps something of him.',
      'Unforgettable is written for that moment after: the presence that stays when the person has gone.',
    ],
    bottle:
      'A block of faceted clear glass, bevelled at every edge so the light breaks into the juice. A square black cap, a thin brass collar, and the HG monogram engraved on the face.',
    notes: null, // TODO(launch): add verified notes — the "Composition" section appears automatically
    status: 'available',
    packshot: 'still-packshot',
    gallery: [
      { name: 'still-packshot', alt: 'Unforgettable — the HG bottle, front view' },
      { name: 'unf-portrait', alt: 'A man in a black jacket holds Unforgettable up to the light', focus: '50% 30%' },
      { name: 'unf-packshot-vertical', alt: 'The bottle on a walnut desk under the lamp, rain on the window behind' },
    ],
    storyTitle: 'Worn once, |at the collar.',
    portrait: { name: 'riv-spray', alt: 'Eyes closed, he wears Unforgettable once, at the collar' },
    campaign: [
      { name: 'drv-window', alt: 'Through the lowered window of a black vintage car at night, a man holds Unforgettable at his collar, rain on the glass', caption: 'The window', focus: '62% 35%' },
      { name: 'face-m1', alt: 'In a dark study by a rain-streaked window, a man in a black shirt holds Unforgettable at his chest', caption: 'The study', focus: '50% 30%' },
      { name: 'unf-empty-study', alt: 'The empty study, mist still hanging in the lamplight', caption: 'The room after', focus: '60% 50%' },
    ],
    variants: [
      { id: 'unforgettable-100', label: '100 ml', price: 245, available: true },
      { id: 'unforgettable-50', label: '50 ml', price: 175, available: true },
    ],
  },
  {
    slug: 'open-window',
    number: 'N°02',
    name: 'Open Window',
    season: 'Spring',
    seasonOrder: 1,
    accent: '#a9b98f',
    concentration: 'Eau de Parfum',
    shortLine: 'Open it. Let the morning in.',
    story: [
      'The first warm morning after the rain. Someone opens the window, and the room fills with wet leaves, cool stone and light.',
      'Open Window is green and luminous: bergamot and fig leaf first, then iris softened by neroli, settling into white musk and cedar.',
      'It is the same room as Unforgettable, at the other end of the year — with the curtains drawn back.',
    ],
    bottle:
      'The house flacon in a lighter key: pale green-gold juice, a brushed silver collar and a silver monogram beneath the same square black cap.',
    notes: {
      top: ['Bergamot', 'Green fig leaf', 'Pink pepper'],
      heart: ['Iris', 'Neroli', 'Violet leaf'],
      base: ['White musk', 'Cedarwood', 'Vetiver'],
    },
    status: 'coming-soon',
    packshot: 'ow-packshot',
    gallery: [
      { name: 'ow-packshot', alt: 'Open Window — the HG bottle with pale green-gold juice and a silver collar, front view' },
      { name: 'ow-window', alt: 'The Open Window bottle on a limestone sill of an open window, a rain-washed garden and a lifting linen curtain' },
      { name: 'ow-coupe', alt: 'A woman in an ivory silk dress beside a pale sage-green classic coupe at a lakeside villa, holding Open Window' },
    ],
    storyTitle: 'The same room, |curtains drawn back.',
    portrait: { name: 'ow-morning', alt: 'A man in a cream knit at tall open French windows above a misty lake, holding Open Window', focus: '55% 40%' },
    campaign: [
      { name: 'ow-coupe', alt: 'A woman in an ivory silk dress beside a pale sage-green classic coupe on a wet gravel drive, wisteria and cypresses behind, holding Open Window', caption: 'The drive' },
      { name: 'ow-window', alt: 'The Open Window bottle on a limestone windowsill, curtain lifting, the garden wet with rain', caption: 'The sill' },
      { name: 'ow-morning', alt: 'A man in a cream knit at tall open French windows above a misty lake, holding Open Window', caption: 'The morning', wide: true, focus: '55% 50%' },
    ],
    variants: [],
  },
  {
    slug: 'last-light',
    number: 'N°03',
    name: 'Last Light',
    season: 'Summer',
    seasonOrder: 2,
    accent: '#d9a07c',
    concentration: 'Eau de Parfum',
    shortLine: 'The hour the sea turns gold.',
    story: [
      'Late afternoon on the coast. Salt on the skin, a stone terrace still warm, the sun about to touch the water.',
      'Last Light opens on bitter orange and a salt accord, warms through fig and jasmine, and dries down to ambrette and driftwood — skin after a day in the sun.',
      'It is HG in summer: the night is coming, but not yet.',
    ],
    bottle:
      'Blush rosé-gold juice, a polished rose-gold collar and a rose-gold monogram — the house flacon holding the last of the light.',
    notes: {
      top: ['Bitter orange', 'Mandarin', 'Salt accord'],
      heart: ['Fig', 'Neroli', 'Jasmine sambac'],
      base: ['Ambrette', 'Driftwood accord', 'Skin musk'],
    },
    status: 'coming-soon',
    packshot: 'll-packshot',
    gallery: [
      { name: 'll-packshot', alt: 'Last Light — the HG bottle with blush rosé-gold juice and a rose-gold collar, front view' },
      { name: 'll-rock', alt: 'The Last Light bottle on a sun-bleached rock by the sea at golden hour, sea spray on the glass' },
      { name: 'll-pier', alt: 'A man in an open white linen shirt on a stone pier above turquoise water, holding Last Light' },
    ],
    storyTitle: 'The night is coming, |but not yet.',
    portrait: { name: 'll-pier', alt: 'A man with sea-wet hair on a stone pier, a wooden boat behind, holding Last Light', focus: '50% 30%' },
    campaign: [
      { name: 'll-pier', alt: 'A man with sea-wet hair on a stone pier, a wooden boat behind, holding Last Light', caption: 'After the swim' },
      { name: 'll-rock', alt: 'The Last Light bottle on a white rock, salt crystals and spray, the sea gold behind', caption: 'Salt' },
    ],
    variants: [],
  },
  {
    slug: 'nocturne',
    number: 'N°04',
    name: 'Nocturne',
    season: 'Winter',
    seasonOrder: 4,
    accent: '#b56a72',
    concentration: 'Extrait de Parfum',
    shortLine: 'Snow outside. Fire within.',
    story: [
      'The longest night of the year, in a house high in the mountains. Snow against the window, a fire that has burned for hours.',
      'Nocturne begins with black pepper and cardamom over dark plum, moves into smoked tea, leather and rose, and settles deep into oud, labdanum and vanilla.',
      'It is the darkest of the four, and the closest to the skin.',
    ],
    bottle:
      'Garnet-black juice that glows red only when light passes through it, a satin black collar and the monogram in gold.',
    notes: {
      top: ['Black pepper', 'Cardamom', 'Dark plum'],
      heart: ['Smoked black tea', 'Leather', 'Rose absolute'],
      base: ['Oud accord', 'Labdanum', 'Tonka bean', 'Vanilla'],
    },
    status: 'coming-soon',
    packshot: 'nc-packshot',
    gallery: [
      { name: 'nc-packshot', alt: 'Nocturne — the HG bottle with garnet-black juice and a satin black collar, front view' },
      { name: 'nc-velvet', alt: 'The Nocturne bottle on black velvet dusted with snow, a snowy window behind' },
    ],
    storyTitle: 'The closest |to the skin.',
    portrait: { name: 'nc-village', alt: 'A man in a black overcoat beside a black sports car on a snowy alpine street at night, holding Nocturne', focus: '70% 45%' },
    campaign: [
      { name: 'nc-village', alt: 'A man in a black overcoat beside a matte black supercar on a snowy alpine street at night, holding Nocturne', caption: 'The village', wide: true, focus: '68% 50%' },
      { name: 'nc-velvet', alt: 'Nocturne on black velvet with fine snow, a window of falling snow behind', caption: 'Velvet' },
    ],
    variants: [],
  },
];

/** The four products in seasonal order (spring → winter). */
export const bySeason = () => [...products].sort((a, b) => a.seasonOrder - b.seasonOrder);

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);

export const isPurchasable = (p: Product) => p.status === 'available' && p.variants.some((v) => v.available);

export const fromPrice = (p: Product) => {
  const prices = p.variants.filter((v) => v.available).map((v) => v.price);
  return prices.length ? Math.min(...prices) : null;
};

export const findVariant = (variantId: string) => {
  for (const product of products) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant) return { product, variant };
  }
  return undefined;
};

/** Minimal catalogue shipped to the browser for the bag UI (purchasable variants only). */
export const clientCatalog = () =>
  Object.fromEntries(
    products.flatMap((p) =>
      p.variants
        .filter((v) => v.available && p.status === 'available')
        .map((v) => [
          v.id,
          { name: p.name, number: p.number, label: v.label, price: v.price, slug: p.slug, available: v.available, packshot: p.packshot },
        ]),
    ),
  );
