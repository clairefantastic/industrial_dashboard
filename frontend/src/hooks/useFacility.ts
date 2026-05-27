/**
 * useFacility.ts — React Query hooks for facility data.
 *
 * Reason for using React Query instead of raw useEffect + fetch?
 * - Automatic background refetch (refetchInterval) → live dashboard
 * - Deduplication: multiple components using the same hook share one request
 * - Built-in loading/error states — no manual useState boilerplate
 * - Stale-while-revalidate: shows cached data instantly, fetches in background
 */

import { useQuery } from "@tanstack/react-query";
import {
  fetchFacilities,
  fetchFacilitySummary,
  type Facility,
  type FacilitySummary,
} from "../api/client";

const REFETCH_INTERVAL = 30_000; // 30 seconds

export const useFacilities = () =>
  useQuery<Facility[]>({
    queryKey:       ["facilities"],
    queryFn:        fetchFacilities,
    staleTime:      60_000,   // facilities rarely change — cache for 1 min
    refetchInterval: false,   // no auto-refresh needed
  });

export const useFacilitySummary = (facilityId: number | null) =>
  useQuery<FacilitySummary>({
    queryKey:        ["facility-summary", facilityId],
    queryFn:         () => fetchFacilitySummary(facilityId!),
    enabled:         facilityId !== null,
    refetchInterval: REFETCH_INTERVAL,
    staleTime:       REFETCH_INTERVAL - 5_000,
  });