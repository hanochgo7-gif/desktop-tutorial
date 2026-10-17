/**
 * HG — site configuration.
 *
 * Everything a non-developer may need to change before launch lives here.
 * Values marked `null` are intentionally unset: the UI hides the element
 * instead of showing a placeholder. See LAUNCH.md for the full checklist.
 */

export const site = {
  name: 'HG',
  fullName: 'HG Fragrance',
  tagline: 'Unforgettable.',
  description:
    'HG — a fragrance house of few words. Discover Unforgettable, the first HG fragrance, and the film that introduced it.',

  /** Locale is driven from here so the layout can switch to Hebrew / RTL later. */
  locale: { lang: 'en', dir: 'ltr' as 'ltr' | 'rtl' },

  /** Client care. `null` hides the line. TODO(launch): confirm real addresses. */
  contact: {
    email: null as string | null,
    phone: null as string | null,
    address: null as string | null,
  },

  /** Social profiles. `null` hides the link. TODO(launch): add verified handles. */
  social: {
    instagram: null as string | null,
    tiktok: null as string | null,
    youtube: null as string | null,
  },

  /** Disclosure shown with campaign imagery (the film's end card carries the same note). */
  aiDisclosure: 'Campaign film and imagery created with AI.',

  legalEntity: null as string | null, // TODO(launch): registered company name for the footer
} as const;

export const commerce = {
  currency: 'USD',
  /**
   * Prices show on the site as set in the catalogue. Only when this is true does the product's
   * structured data (Google) carry them as offers — set it once the prices are final.
   */
  pricesConfirmed: false,
  /** Countries Stripe Checkout may ship to (ISO 3166-1 alpha-2). TODO(launch). */
  shippingCountries: ['US', 'GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'IL', 'AE', 'CA', 'AU'],
  maxQuantityPerLine: 6,
} as const;
