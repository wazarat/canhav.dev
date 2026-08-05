// Stops PostCSS config resolution from walking up to the repo root's
// postcss.config.mjs (Next's Tailwind config), which can't load inside the
// indexer's standalone install on Render. The indexer has no CSS at all.
module.exports = { plugins: [] };
