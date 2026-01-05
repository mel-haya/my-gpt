import { useQuery, UseQueryResult } from "@tanstack/react-query";
import type { SelectConversation } from "@/lib/db-schema";

const fetchConversations = async (searchQuery?: string): Promise<SelectConversation[]> => {
  const url = searchQuery
    ? `/api/files?search=${encodeURIComponent(searchQuery)}`
    : "/api/files";

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch conversations: ${res.statusText}`);
  }

  return res.json();
};

export const useConversations = (searchQuery?: string, options?: { enabled?: boolean }): UseQueryResult<SelectConversation[], Error> => {
  return useQuery({
    queryKey: ["Files", searchQuery],
    queryFn: () => fetchConversations(searchQuery),
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
  });
};

export default useConversations;
