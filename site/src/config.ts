// Store pages, one button each, e.g.
// { text: 'Download on the App Store', url: 'https://apps.apple.com/app/id0000000000' } or
// { text: 'Get it on Google Play', url: 'https://play.google.com/store/apps/details?id=…' }.
// While the list is empty the page shows "Coming soon".
export const STORE_LINKS: { text: string; url: string }[] = [];

// Shown on the page. Only recipes marked reviewed ship in store builds, so keep this
// in step with what the release build actually contains.
export const RECIPE_COUNT = 120;

// A screen recording of scanning a recipe, shown in the scan section. Put the files in
// site/public/ (e.g. { src: '/scan-demo.mp4', poster: '/scan-demo.jpg' }). While it's null
// the section shows a drawn animation of the same flow.
export const SCAN_VIDEO: { src: string; poster?: string } | null = null;
