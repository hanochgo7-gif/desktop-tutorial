/**
 * HG campaign library — every film and still produced for HG in Higgsfield.
 * Campaign titles below ("Riviera", "Night Drive", "Studio") are working titles; rename freely.
 */

export interface Still {
  name: string; // image master in src/assets/img
  alt: string;
  caption: string;
  wide?: boolean; // spans two columns in editorial grids
  focus?: string; // object-position when cropped to portrait
}

export interface Campaign {
  id: string;
  number: string;
  title: string;
  line: string;
  intro: string;
  film?: { src: string; poster: string; label: string; sound: boolean; duration: string; href?: string };
  loop?: { src: string; poster: string }; // short ambient loop for homepage cards
  stills: Still[];
}

export const campaigns: Campaign[] = [
  {
    id: 'unforgettable',
    number: 'I',
    title: 'Unforgettable',
    line: 'Leave the room. Stay in it.',
    intro:
      'A study at night, rain on the glass, a brass lamp left on. He wears it once at the collar and leaves; the room keeps him.',
    film: {
      src: '/media/hg-unforgettable-film.mp4',
      poster: '/media/film-poster.jpg',
      label: 'HG — Unforgettable. Campaign film, 20 seconds, with sound and captions.',
      sound: true,
      duration: '0:20',
      href: '/film',
    },
    loop: { src: '/media/campaigns/unf-desk-hero.mp4', poster: '/media/campaigns/unf-desk-hero-poster.jpg' },
    stills: [
      { name: 'unf-desk-hero', alt: 'The HG bottle on the walnut desk, the brass lamp and the rain-blurred city behind', caption: 'The desk', wide: true },
      { name: 'unf-packshot-vertical', alt: 'Vertical packshot of the HG bottle under the lamp, rain on the window', caption: 'Packshot' },
      { name: 'unf-portrait', alt: 'Portrait of the man in a black jacket holding the HG bottle up to the light', caption: 'Portrait' },
      { name: 'unf-profile', alt: 'The man in profile holding the HG bottle in the dark study', caption: 'Before' },
      { name: 'unf-spray', alt: 'Backlit, he sprays the fragrance at the collar; the mist catches the lamp', caption: 'The ritual' },
      { name: 'unf-window-wide', alt: 'The study at night, a tall window streaked with rain, the city lit beyond', caption: 'The window', wide: true },
      { name: 'unf-macro-amber', alt: 'Amber juice seen through thick faceted crystal', caption: 'Amber' },
      { name: 'unf-macro-edge', alt: 'A bevelled glass edge in sharp focus, amber light behind', caption: 'The bevel' },
      { name: 'unf-low-angle', alt: 'Low-angle hero shot of the HG bottle on the desk', caption: 'Low light' },
      { name: 'unf-door', alt: 'The study door open to a lit hallway as he leaves', caption: 'The door' },
      { name: 'unf-lamp', alt: 'The empty study: a green banker’s lamp on the desk, a leather chair, rain on the tall window', caption: 'Lamp left on' },
      { name: 'unf-empty-study', alt: 'The empty study, mist still hanging in the lamplight', caption: 'The room after', wide: true },
    ],
  },
  {
    id: 'riviera',
    number: 'II',
    title: 'Riviera',
    line: 'The coast road, a terrace of candles.',
    intro:
      'Blue hour on a cliff road above the sea. A black coupe, a villa lit by lanterns, a woman in crimson silk who looks back once. The bottle waits on the balustrade.',
    film: {
      src: '/media/campaigns/riviera-reel.mp4',
      poster: '/media/campaigns/riviera-reel-poster.jpg',
      label: 'HG — Riviera. Campaign reel, 26 seconds, silent.',
      sound: false, duration: '0:26',
    },
    loop: { src: '/media/campaigns/riv-balustrade.mp4', poster: '/media/campaigns/riv-balustrade-poster.jpg' },
    stills: [
      { name: 'riv-aerial', alt: 'Aerial view of a black coupe on a winding cliff road above the sea at blue hour', caption: 'The coast road', wide: true },
      { name: 'riv-coupe', alt: 'The matte black coupe parked on a wet terrace above the bay at blue hour, its light bar glowing', caption: 'The coupe', wide: true },
      { name: 'riv-lightbar', alt: 'Close detail of the coupe’s thin light bar glowing at night', caption: 'Light bar' },
      { name: 'riv-wheel', alt: 'Road-level view beside the coupe’s front wheel on a wet road', caption: 'Road level' },
      { name: 'riv-arrival', alt: 'The coupe stopped on the gravel forecourt of a villa, a man in a dinner suit stepping out', caption: 'Arrival', wide: true },
      { name: 'riv-woman', alt: 'A woman in a crimson silk gown on a terrace above the sea at blue hour', caption: 'Crimson' },
      { name: 'riv-terrace', alt: 'On a candlelit terrace she looks back over her shoulder as he walks toward her', caption: 'The terrace' },
      { name: 'riv-dressing', alt: 'The man in a dinner jacket holding the HG bottle in a dim dressing room', caption: 'Dressing room' },
      { name: 'riv-spray', alt: 'Close-up: he sprays HG at his neck, eyes closed', caption: 'The spray' },
      { name: 'riv-two', alt: 'Close two-shot of the couple on the candlelit terrace', caption: 'Close' },
      { name: 'riv-car-interior', alt: 'The man at the wheel of the coupe at night, coastal lights behind', caption: 'At the wheel' },
      { name: 'riv-balustrade', alt: 'The HG bottle on a stone balustrade, candles and the lit coast behind', caption: 'The balustrade', wide: true },
    ],
  },
  {
    id: 'night-drive',
    number: 'III',
    title: 'Night Drive',
    line: 'Wet stone, wire wheels, the emblem in the headlight.',
    intro:
      'A black grand tourer from another decade, rain on its bonnet, the HG emblem catching the headlight. The road runs along the sea to a villa door.',
    film: {
      src: '/media/campaigns/night-drive-reel.mp4',
      poster: '/media/campaigns/night-drive-reel-poster.jpg',
      label: 'HG — Night Drive. Campaign reel, 24 seconds, silent.',
      sound: false, duration: '0:24',
    },
    loop: { src: '/media/campaigns/drv-emblem.mp4', poster: '/media/campaigns/drv-emblem-poster.jpg' },
    stills: [
      { name: 'drv-aerial', alt: 'Aerial view of a small black vintage car on a cliffside road at night', caption: 'From above', wide: true },
      { name: 'drv-window', alt: 'Through the lowered window of the black car, he holds the HG bottle at his collar, raindrops on the glass and the harbour lights behind', caption: 'The window', focus: '62% 35%' },
      { name: 'drv-emblem', alt: 'Rain on the black bonnet beside a round headlight and the oval HG emblem', caption: 'The emblem' },
      { name: 'drv-rain-glass', alt: 'Seen through the rain-beaded driver’s window, he sits at the wheel while the lit bay reflects across the glass', caption: 'Rain on the glass', wide: true },
      { name: 'drv-coast', alt: 'The vintage car tracked along the seafront road at night', caption: 'Seafront', wide: true },
      { name: 'drv-wheel', alt: 'A chrome wire-spoke wheel rolling over wet cobblestones', caption: 'Wire wheel' },
      { name: 'drv-reflection', alt: 'His profile through the side window, the street lamps and the village across the bay reflected over him', caption: 'Reflection', focus: '45% 40%' },
      { name: 'drv-terrace', alt: 'The black vintage car on a wet cobbled terrace, the sea and village lights beyond', caption: 'Terrace', wide: true },
      { name: 'drv-sill', alt: 'Through the open window he looks into the camera, the HG bottle in his hand on the wet door sill', caption: 'The sill', wide: true },
      { name: 'drv-villa', alt: 'The man walking past the parked car toward a villa entrance with lanterns and bougainvillea', caption: 'The villa' },
    ],
  },
  {
    id: 'studio',
    number: 'IV',
    title: 'Studio',
    line: 'The bottle, alone.',
    intro:
      'The bottle on its own: on wet black marble under a single warm light, and by day against ivory among dark lilies, the mist hanging in the air after one press.',
    film: {
      src: '/media/campaigns/studio-mist.mp4',
      poster: '/media/campaigns/studio-mist-poster.jpg',
      label: 'HG — Studio. Product film, silent.',
      sound: false, duration: '0:04',
    },
    loop: { src: '/media/campaigns/studio-marble.mp4', poster: '/media/campaigns/studio-marble-poster.jpg' },
    stills: [
      { name: 'stu-lily', alt: 'The HG bottle tilted on a dark burgundy calla lily and thistles, warm light on an ivory wall', caption: 'Still life' },
      { name: 'stu-mist', alt: 'The HG bottle releasing a fine golden mist on wet black marble', caption: 'Mist', wide: true },
      { name: 'stu-marble-front', alt: 'Front view of the HG bottle on black marble', caption: 'Front' },
      { name: 'stu-marble-lying', alt: 'The HG bottle lying on its side on polished black marble, macro', caption: 'At rest' },
    ],
  },
];

campaigns.push({
  id: 'rosso',
  number: 'V',
  title: 'Rosso',
  line: 'Red paint, low sun, the bottle in hand.',
  intro:
    'A red mid-engine coupe on the coast road at golden hour, then a stone villa at dusk. The same man, the same bottle, held up to the light.',
  stills: [
    { name: 'rosso-golden', alt: 'The man in a black suit leaning on a red sports car on a coastal road at golden hour, holding the HG bottle', caption: 'Coast road' },
    { name: 'rosso-closeup', alt: 'Close-up: his hand sets the HG bottle on the glossy red roof of the car, the bottle reflected in the paint', caption: 'Reflection' },
    { name: 'rosso-villa', alt: 'At dusk he sits in the open door of the red car outside a stone villa with bougainvillea, the HG bottle in his hand', caption: 'The villa' },
    { name: 'rosso-night', alt: 'Night in the city: he stands by the red car on a wet street, the HG bottle in his hand', caption: 'City night', wide: true },
    { name: 'rosso-hand', alt: 'He leans over the glossy red car and sets the HG bottle on the bodywork, its reflection in the paint', caption: 'In hand' },
    { name: 'rosso-passenger', alt: 'A woman with long dark hair in the window of the red car, holding the HG bottle to the camera', caption: 'Passenger' },
    { name: 'rosso-promenade', alt: 'On a seafront promenade lit by lamps he leans on the red car, holding the HG bottle', caption: 'Promenade', wide: true },
  ],
});

export const studioLoops = [
  { src: '/media/campaigns/studio-upright.mp4', poster: '/media/campaigns/studio-upright-poster.jpg' },
  { src: '/media/campaigns/studio-lying.mp4', poster: '/media/campaigns/studio-lying-poster.jpg' },
];
