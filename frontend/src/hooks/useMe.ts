"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { meApi } from "@/lib/api";

export function useMe() {
  const { isLoaded, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ["me"],
    queryFn: async () => (await meApi.get()).data,
    enabled: isLoaded && !!isSignedIn,
    staleTime: 60_000,
  });
}
