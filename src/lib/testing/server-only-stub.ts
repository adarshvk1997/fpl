// Test-only stand-in for the "server-only" package (see vitest.config.mts).
// The real package unconditionally throws on import — it relies on Next.js's
// bundler to keep it out of client code entirely, not a runtime check — so
// it has no way to know a Vitest/Node test run is a legitimate "server"
// context. This file is aliased in during tests only; production/dev/build
// still resolve to the real "server-only" package.
export {};
