import type { ImageMetadata } from 'astro';

const files = import.meta.glob<{ default: ImageMetadata }>('./img/*.jpg', { eager: true });

/** File name (without extension) of an image master in ./img — e.g. "film-window", "riv-terrace". */
export type ImageName = string;

export const img = (name: ImageName): ImageMetadata => {
  const file = files[`./img/${name}.jpg`];
  if (!file) throw new Error(`Missing image: ${name}`);
  return file.default;
};
