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

// react-native-qrcode-svg imports the `qrcode` npm package for its matrix
// encoder. That package's own "main" is a Node/CLI-oriented entry (pulls in
// yargs et al., which Metro can't bundle). Its package.json declares a
// "browser" field pointing at the dependency-free browser build, but Metro
// only honors "browser" for bare module names, not this kind of path
// remap — and extraNodeModules is only a fallback for names normal
// resolution fails on (it resolves `qrcode` fine, just to the wrong entry),
// so neither applies here. A custom resolveRequest is the only hook that
// can override an already-resolvable module.
const qrcodeBrowserEntry = path.resolve(projectRoot, 'node_modules/qrcode/lib/browser.js');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'qrcode') {
    return { type: 'sourceFile', filePath: qrcodeBrowserEntry };
  }
  // react-native-qrcode-svg's LogoSVG (rendered only for the optional
  // logo/logoSVG props, which this app never sets) statically imports
  // react-native-svg's optional CSS submodule for its LocalSvg fallback —
  // that submodule pulls in css-tree, whose source-map output support
  // needs Node's `url` module, which Metro doesn't polyfill. Stub it out:
  // LogoSVG's LocalSvg branch is dead code here, so an empty module is safe.
  if (moduleName === 'react-native-svg/css') {
    return { type: 'empty' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
