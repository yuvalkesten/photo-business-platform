"use client";

import { useQuery } from "@tanstack/react-query";
import { getInstagramMessages } from "@/actions/instagram";

interface MessagesFilters {
  classification?: string;
  status?: string;
  page: number;
}

/**
 * Hook for polling Instagram messages with automatic refresh.
 * Fetches messages every 10 seconds while the tab is visible.
 */
export function useMessagesPolling(filters: MessagesFilters, interval = 10000) {
  return useQuery({
    queryKey: ["instagram-messages", filters],
    queryFn: () =>
      getInstagramMessages({
        classification: filters.classification,
        status: filters.status,
        page: filters.page,
        limit: 20,
      }),
    refetchInterval: interval,
    refetchIntervalInBackground: false, // Don't poll when tab is not visible
  });
}
