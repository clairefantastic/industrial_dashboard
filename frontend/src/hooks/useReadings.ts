/**
 * useReadings.ts — React Query hook for time-series sensor data.
 *
 * Refetches every 30s to keep the chart current.
 * timeRange controls the lookback window (1h, 6h, 24h).
 */

import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { fetchSensorReadings, type SensorReadingsResponse } from "../api/client";

export type TimeRange = "1h" | "6h" | "24h";

const HOURS: Record<TimeRange, number> = { "1h": 1, "6h": 6, "24h": 24 };
const REFETCH_INTERVAL = 30_000;

interface UseReadingsParams {
  facilityId:  number | null;
  metricName:  string;
  timeRange:   TimeRange;
}

export const useReadings = ({
  facilityId,
  metricName,
  timeRange,
}: UseReadingsParams) => {
  const hours    = HOURS[timeRange];
  const from_time = dayjs().subtract(hours, "hour").toISOString();
  const to_time   = dayjs().toISOString();

  return useQuery<SensorReadingsResponse>({
    queryKey: ["readings", facilityId, metricName, timeRange],
    queryFn:  () =>
      fetchSensorReadings({
        facility_id: facilityId!,
        metric_name: metricName,
        from_time,
        to_time,
        limit: 1000,
      }),
    enabled:         facilityId !== null && metricName !== "",
    refetchInterval: REFETCH_INTERVAL,
    staleTime:       REFETCH_INTERVAL - 5_000,
  });
};