import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // NestJS's constructor DI relies on `emitDecoratorMetadata`, which Vitest's default esbuild
  // transform does not emit. Transforming through SWC (the same compiler Nest CLI builds with)
  // keeps decorator metadata intact so tests that boot a real Nest container can resolve providers.
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: "typescript", decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        keepClassNames: true,
        target: "es2022",
      },
    }),
  ],
  test: {
    globals: false,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/modules/**/*.ts"],
      exclude: ["src/modules/**/*.types.ts"],
    },
  },
});
