// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

// Public origin of the site. Set SITE_URL in the environment before a production build.
// On Vercel it falls back to the production domain Vercel provides.
const site =
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  'http://localhost:4321';

export default defineConfig({
  site,
  // Pages are prerendered (static); only /api/* and /checkout/success run on the server.
  output: 'static',
  // Retired pages: the collection list and the house page.
  redirects: {
    '/fragrances': '/fragrances/unforgettable',
    '/house': '/campaigns',
  },
  // Vercel builds use its serverless adapter; everywhere else the standalone Node server.
  adapter: process.env.VERCEL ? vercel() : node({ mode: 'standalone' }),
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/checkout/') && !page.includes('/bag'),
    }),
  ],
  build: {
    // Inline page CSS so first paint is not blocked on a stylesheet request.
    inlineStylesheets: 'always',
  },
  image: {
    responsiveStyles: false,
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  devToolbar: { enabled: false },
});
