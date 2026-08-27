"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

type Props = {
  children: ReactNode;
};

/**
 * Client-only server-state layer (FE-007). One QueryClient per browser session, created lazily
 * inside `useState` so it survives re-renders but is never shared across requests on the server.
 */
export function Providers({ children }: Props) {
  const [queryClient] = useState(() => new QueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
