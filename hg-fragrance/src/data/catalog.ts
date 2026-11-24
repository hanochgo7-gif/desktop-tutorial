/**
 * Product catalogue — the single source of truth for the storefront,
 * the bag and the server-side checkout (prices are never trusted from the browser).
 *
 * The house: four fragrances, one per season, one flacon.
 *   N°01 Unforgettable (Autumn) — the flagship, verified from HG's own campaign.
 *   N°02 Open Window (Spring), N°03 Last Light (Summer), N°04 Nocturne (Winter) —
 *   new fragrance concepts. Their compositions are creative briefs to develop with a
 *   perfumer. On the demo site they are on sale in the house flacon at the same sizes
 *   and prices as Unforgettable, so a visitor can choose between the four; set their
 *   real formats and prices here before launch. See LAUNCH.md.
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
  portrait: { name: string; alt: string; focus?: string }; // the season's fashion portrait: beside the story, and on the campaign page
  storyTitle: string; // story heading; text after '|' is set in italics
  storyFilm?: { src: string; poster: string; alt: string }; // optional looping film beside the story (poster path without extension: .webp + .jpg)
  galleryFilm?: { src: string; poster: string; alt: string }; // optional looping product film, second in the gallery (same poster convention)
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
      { name: 'still-monogram', alt: 'Close detail: the HG monogram engraved in the faceted glass, amber juice behind it' },
      { name: 'still-travertine', alt: 'The Unforgettable bottle in morning light on a travertine ledge by a window' },
      { name: 'unf-packshot-vertical', alt: 'The bottle on a walnut desk under the lamp, rain on the window behind' },
    ],
    storyTitle: 'Worn once, |at the collar.',
    galleryFilm: {
      src: '/media/unforgettable-turn.mp4',
      poster: '/media/unforgettable-turn-poster',
      alt: 'The Unforgettable bottle turning slowly in a white studio, a close look at the cap and brass collar, then the bottle from above',
    },
    portrait: { name: 'fashion-unforgettable', alt: 'In a black tuxedo and silk shirt at a rain-streaked window high above the city, he holds Unforgettable at his collar', focus: '50% 25%' },
    campaign: [
      { name: 'cupra-golden', alt: 'Unforgettable on the stone kerb of a coastal road at golden hour, a grey-beige CUPRA Leon behind it', caption: 'The road', focus: '50% 55%' },
      { name: 'cupra-interior', alt: 'Unforgettable on the copper-stitched seat of a CUPRA Leon at night, rain and city lights on the window', caption: 'The seat', focus: '50% 55%' },
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
    status: 'available',
    packshot: 'ow-packshot',
    gallery: [
      { name: 'ow-packshot', alt: 'Open Window — the HG bottle with pale green-gold juice and a silver collar, front view' },
      { name: 'ow-window', alt: 'The Open Window bottle on a limestone sill of an open window, a rain-washed garden and a lifting linen curtain' },
      { name: 'ow-coupe', alt: 'A woman in an ivory silk dress beside a pale sage-green classic coupe at a lakeside villa, holding Open Window' },
      { name: 'fashion-open-window-b', alt: 'In an ivory linen suit in a sunlit orangery, curtains blowing in, a man holds Open Window to his chest', focus: '50% 30%' },
    ],
    storyTitle: 'The same room, |curtains drawn back.',
    portrait: { name: 'fashion-open-window', alt: 'In a sage silk shirt he sits on the sill of an open villa window, wisteria around it and a linen curtain blowing out, holding Open Window', focus: '50% 35%' },
    campaign: [
      { name: 'ow-coupe', alt: 'A woman in an ivory silk dress beside a pale sage-green classic coupe on a wet gravel drive, wisteria and cypresses behind, holding Open Window', caption: 'The drive' },
      { name: 'ow-window', alt: 'The Open Window bottle on a limestone windowsill, curtain lifting, the garden wet with rain', caption: 'The sill' },
    ],
    variants: [
      { id: 'open-window-100', label: '100 ml', price: 245, available: true },
      { id: 'open-window-50', label: '50 ml', price: 175, available: true },
    ],
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
    status: 'available',
    packshot: 'll-packshot',
    gallery: [
      { name: 'll-packshot', alt: 'Last Light — the HG bottle with blush rosé-gold juice and a rose-gold collar, front view' },
      { name: 'll-rock', alt: 'The Last Light bottle on a sun-bleached rock by the sea at golden hour, sea spray on the glass' },
      { name: 'fashion-last-light-b', alt: 'Barefoot on whitewashed steps above the sea at sunset, a man in cream linen holds Last Light on his knee', focus: '50% 45%' },
    ],
    storyTitle: 'The night is coming, |but not yet.',
    portrait: { name: 'fashion-last-light', alt: 'Sea-wet, in an open terracotta shirt, he leans on the mast of a sailing yacht at sunset and holds Last Light up to the sun', focus: '50% 30%' },
    campaign: [
      { name: 'll-rock', alt: 'The Last Light bottle on a white rock, salt crystals and spray, the sea gold behind', caption: 'Salt' },
    ],
    variants: [
      { id: 'last-light-100', label: '100 ml', price: 245, available: true },
      { id: 'last-light-50', label: '50 ml', price: 175, available: true },
    ],
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
    status: 'available',
    packshot: 'nc-packshot',
    gallery: [
      { name: 'nc-packshot', alt: 'Nocturne — the HG bottle with garnet-black juice and a satin black collar, front view' },
      { name: 'nc-velvet', alt: 'The Nocturne bottle on black velvet dusted with snow, a snowy window behind' },
      { name: 'fashion-nocturne-c', alt: 'In a long black coat by a mountain window, a fire behind him, a man holds Nocturne at his chest', focus: '50% 30%' },
    ],
    storyTitle: 'The closest |to the skin.',
    storyFilm: {
      src: '/media/nocturne-walk.mp4',
      poster: '/media/nocturne-walk-poster',
      alt: 'At sunrise a man in a long black coat walks down an empty city street, then holds Nocturne up to the light',
    },
    portrait: { name: 'fashion-nocturne', alt: 'In a black velvet tuxedo jacket and rollneck by a mountain fireplace, snow falling outside, he holds Nocturne so it glows garnet', focus: '50% 30%' },
    campaign: [
      { name: 'nc-velvet', alt: 'Nocturne on black velvet with fine snow, a window of falling snow behind', caption: 'Velvet' },
    ],
    variants: [
      { id: 'nocturne-100', label: '100 ml', price: 245, available: true },
      { id: 'nocturne-50', label: '50 ml', price: 175, available: true },
    ],
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
