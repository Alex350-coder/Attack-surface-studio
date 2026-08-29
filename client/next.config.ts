import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pnpm-workspace.yaml declares this package as its own workspace root ("packages: ['.']"),
  // which makes Turbopack's automatic root inference walk up and lose track of `next` itself.
  // Pin it explicitly to this directory. This alone did not resolve a `next build` failure in
  // one dev environment (long, doubly-nested OneDrive path) -- `pnpm build` runs
  // `next build --webpack` as a pragmatic fallback until that Turbopack root-inference issue
  // is understood; `next dev` is unaffected and still uses Turbopack.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // server-contracts.ts re-exports the backend's raw TypeScript Zod schemas
  // (@attack-surface-studio/server/src/contracts) so both sides share one contract (DRY). That
  // package ships untranspiled `.ts` source via a `file:` link, and webpack does not transpile
  // node_modules by default -- without this, any client component that reaches the runtime
  // schemas (e.g. to validate a graph response, FE-004) fails to build with a raw TS parse error.
  transpilePackages: ["@attack-surface-studio/server"],
};

export default nextConfig;
