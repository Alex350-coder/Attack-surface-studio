import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Shared `renderHook`/`render` wrapper factory for React Query hook tests.
 * Each call returns a fresh QueryClient (retries disabled) wrapped in a
 * named component, so tests don't share cache state and eslint's
 * react/display-name rule is satisfied without per-file boilerplate.
 */
export function queryClientWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  Wrapper.displayName = "QueryClientTestWrapper";

  return Wrapper;
}
