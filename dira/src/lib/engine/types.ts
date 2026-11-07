// Shared types for the on-device photo engine.
// Everything here is plain data so it can cross the Web Worker boundary and be stored in IndexedDB.

/** RGBA pixels, 8 bits per channel, row-major. Same layout as the browser's ImageData. */
export type Raster = { width: number; height: number; data: Uint8ClampedArray };

export type SceneProfile = "interior" | "exterior";

/** A straight near-vertical line found in the photo, in proxy-image pixel coordinates. */
export type Line = { x1: number; y1: number; x2: number; y2: number; weight: number };

export type VerticalFit = {
  /** Rotation in the image plane, degrees. */
  roll: number;
  /** Camera tilt up/down, degrees. Causes walls to lean inward. */
  pitch: number;
  /** Focal length used for the fit, as a fraction of the long edge. */
  focal: number;
  /** Lines that support the fit after correction. */
  inliers: number;
  /** Mean lean of the detected lines before correction, degrees. */
  leanBefore: number;
  /** Mean lean after correction, degrees. */
  leanAfter: number;
  confident: boolean;
};

export type Analysis = {
  v: 1;
  width: number;
  height: number;
  megapixels: number;
  /** CIE L* percentiles of the photo, 0..100. */
  lightness: { p01: number; p05: number; p50: number; p95: number; p99: number; mean: number };
  /** Share of pixels at pure white / pure black (0..1). */
  clippedHighlights: number;
  crushedShadows: number;
  /** Share of pixels in each of 11 tonal zones (0 = black, 10 = white). Sums to 1. */
  zones: number[];
  /** Estimated colour temperature of the light in the scene, Kelvin. Null when the scene has too few neutral tones. */
  kelvin: number | null;
  /** Average colour cast of neutral tones in CIELAB (a* and b* axes). */
  cast: { a: number; b: number };
  /** Linear-light mean of neutral tones, used to derive white balance gains. */
  neutralMean: [number, number, number] | null;
  /** Estimated sensor noise, standard deviation in 0..255 units. */
  noise: number;
  /** Variance of the Laplacian on the proxy; higher is sharper. */
  sharpness: number;
  verticals: VerticalFit | null;
  profile: SceneProfile;
  /** Linear luminance at the 0.3rd percentile, used as the black point. */
  blackLevel: number;
  /** Linear luminance median. */
  medianLuminance: number;
};

/** A brush stroke for classic object removal. Coordinates are 0..1 of the original photo. */
export type Stroke = { points: [number, number][]; radius: number };

/** User adjustments on top of the automatic correction. All are offsets around 0. */
export type Adjustments = {
  brightness: number; // -1..1  (about ±1.5 EV)
  warmth: number; // -1..1
  contrast: number; // -1..1
  saturation: number; // -1..1
  shadows: number; // -1..1  how strongly dark areas are opened up
};

export type Recipe = {
  v: 1;
  profile: SceneProfile;
  /** 0..1.5, scales every automatic correction. 1 = recommended. */
  strength: number;
  steps: {
    exposure: boolean;
    whiteBalance: boolean;
    toneMap: boolean;
    verticals: boolean;
    denoise: boolean;
    sharpen: boolean;
  };
  adjust: Adjustments;
  removals: Stroke[];
  upscale: 1 | 2;
};

export type ChangeKind =
  | "exposure"
  | "whiteBalance"
  | "toneMap"
  | "contrast"
  | "color"
  | "verticals"
  | "crop"
  | "denoise"
  | "sharpen"
  | "removal"
  | "upscale";

/** One line of the disclosure log: what was done to the photo, with a measured value. */
export type Change = { kind: ChangeKind; value?: number; from?: number; to?: number; count?: number };

export type RenderResult = { raster: Raster; changes: Change[] };

export type ProgressFn = (fraction: number, stage: string) => void;
