"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ClerkProvider
        appearance={{
          theme: dark,
        }}
      >
        {children}
      </ClerkProvider>
    </QueryClientProvider>
  );
}
