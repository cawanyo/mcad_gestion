const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
// The monorepo root (one level up) — needed so the mobile app can import
// ../../../convex/_generated/api directly from the web app's Convex
// deployment instead of duplicating generated bindings.
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules')
];
// Only the mobile app's own package.json should resolve for "main"/exports
// entrypoints — this stops Metro from trying to bundle the Next.js app.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
