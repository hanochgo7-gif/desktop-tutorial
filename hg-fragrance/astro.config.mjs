// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';

// Public origin of the site. Set SITE_URL in the environment before a production build.
const site = process.env.SITE_URL || 'http://localhost:4321';

export default defineConfig({
  site,
  // Pages are prerendered (static); only /api/* and /checkout/success run on the server.
  output: 'static',
  adapter: node({ mode: 'standalone' }),
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
