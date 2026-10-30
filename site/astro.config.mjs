// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://mealz.menu',
  build: { format: 'directory' },
  vite: {
    // The pages read the icon and the privacy policy from the app repo one level up.
    server: { fs: { allow: ['..'] } },
  },
});
