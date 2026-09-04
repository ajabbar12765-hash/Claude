// Baked in at build time (see vite.config.js) — the commit hash is the
// actual source of truth for "is this the latest build," since a manually
// maintained version number can be forgotten to bump but a commit hash
// can't drift from what's really deployed.
export const APP_VERSION = __APP_VERSION__
export const COMMIT_HASH = __COMMIT_HASH__
export const BUILD_TIME = __BUILD_TIME__
