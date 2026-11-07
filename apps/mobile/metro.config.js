const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// Expo SDK 52+ auto-detects npm/yarn/pnpm/bun workspaces and configures
// Metro's monorepo resolution (watchFolders, nodeModulesPaths, hierarchical
// lookup) automatically — see https://docs.expo.dev/guides/monorepos/. We're
// on SDK 54, so none of that is set by hand here.
let config = getDefaultConfig(__dirname);

// Apply NativeWind's Metro wiring first. It installs its own
// config.resolver.resolveRequest — anything we add below has to wrap that,
// not replace it, or NativeWind's styling breaks app-wide again.
config = withNativeWind(config, { input: "./global.css" });

// react is physically duplicated on disk: apps/mobile/node_modules/react is
// 19.1.0 (correct — what this app's package.json pins), but
// node_modules/nativewind/node_modules/react is a separate 19.2.8 copy that
// npm nests there because react-native-css-interop (nativewind's own
// dependency) declares react as an unpinned peerDependency (">=18"), and
// npm's peer-auto-install doesn't reliably honor root package.json
// `overrides` the way normal dependency edges do — confirmed by inspecting
// node_modules directly after multiple clean reinstalls with scoped
// overrides in place. Two live React copies in one bundle is exactly what
// produces "Invalid hook call" / "Cannot read property of null" on hooks
// like useRef. Forcing Metro to resolve every "react" import to one exact
// file sidesteps the npm-level duplication entirely.
const singleReactPath = require.resolve("react", {
  paths: [path.resolve(__dirname, "node_modules")],
});

const nativeWindResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react" || moduleName.startsWith("react/")) {
    return {
      type: "sourceFile",
      filePath:
        moduleName === "react"
          ? singleReactPath
          : require.resolve(moduleName, { paths: [path.dirname(singleReactPath)] }),
    };
  }
  if (nativeWindResolveRequest) {
    return nativeWindResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
