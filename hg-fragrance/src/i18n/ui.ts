/**
 * Interface strings. Editorial copy lives in the pages; everything the
 * interface says (buttons, states, errors) lives here so a Hebrew (RTL)
 * edition only needs a second dictionary plus translated pages.
 */
const en = {
  'nav.unforgettable': 'Unforgettable',
  'nav.fragrances': 'Fragrances',
  'nav.film': 'Film',
  'nav.campaigns': 'Campaign',
  'nav.menu': 'Menu',
  'nav.close': 'Close',
  'nav.bag': 'Bag',
  'nav.skip': 'Skip to content',

  'bag.title': 'Your bag',
  'bag.empty': 'Your bag is empty.',
  'bag.emptyHint': 'The four fragrances are waiting where you left them.',
  'bag.discover': 'Discover Unforgettable',
  'bag.subtotal': 'Subtotal',
  'bag.shippingNote': 'Shipping and taxes are calculated at checkout.',
  'bag.secure': 'Payment is taken on Stripe’s secure checkout page.',
  'bag.checkout': 'Checkout',
  'bag.remove': 'Remove',
  'bag.increase': 'Increase quantity',
  'bag.decrease': 'Decrease quantity',
  'bag.added': 'Added to your bag',
  'bag.view': 'View bag',

  'product.add': 'Add to bag',
  'product.adding': 'Adding…',
  'product.size': 'Size',
  'product.unavailable': 'Unavailable',

  'checkout.redirecting': 'Opening secure payment…',
  'checkout.notConfigured':
    'Online payment is not enabled yet. Your bag is saved on this device, and nothing has been charged.',
  'checkout.demo':
    'This is a demonstration site, so checkout is switched off: no order is placed and nothing is charged. Your bag stays saved on this device.',
  'bag.demoNote': 'Demo site — checkout is switched off.',
  'bag.continue': 'Continue shopping',
  'bag.explore': 'Explore the fragrances',
  'checkout.error': 'We could not start checkout. Nothing has been charged. Please try again.',

  'newsletter.label': 'Email address',
  'newsletter.submit': 'Subscribe',
  'newsletter.sending': 'Sending…',
  'newsletter.success': 'Thank you. You will hear from us, rarely.',
  'newsletter.invalid': 'Please enter a valid email address.',
  'newsletter.error': 'Something went wrong. Please try again in a moment.',
  'newsletter.unavailable': 'Sign-up is not connected yet. Please try again after launch.',
  'newsletter.consent': 'By subscribing you agree to our privacy policy. Unsubscribe at any time.',

  'film.play': 'Play the film',
  'film.pause': 'Pause',
  'film.resume': 'Play',
  'film.mute': 'Mute',
  'film.unmute': 'Sound on',
  'film.close': 'Close film',

  'motion.label': 'Motion',
  'motion.on': 'On',
  'motion.off': 'Off',
} as const;

export type UIKey = keyof typeof en;

const dictionaries: Record<string, Partial<Record<UIKey, string>>> = {
  en,
  // he: { ... }  — add Hebrew strings here; missing keys fall back to English.
};

export const t = (key: UIKey, lang = 'en') => dictionaries[lang]?.[key] ?? en[key];

/** The subset the browser scripts need. */
export const clientStrings = (lang = 'en') =>
  Object.fromEntries(
    (Object.keys(en) as UIKey[])
      .filter((k) => /^(bag|product|checkout|newsletter|film)\./.test(k))
      .map((k) => [k, t(k, lang)]),
  );
