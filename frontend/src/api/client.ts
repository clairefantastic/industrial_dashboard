/**
 * client.ts — Axios instance and typed API functions.
 *
 * All backend response types are mirrored here from schemas.py.
 * This is the single place to update if the API changes.
 */

import axios from "axios";

// In Docker: requests go through Vite proxy /api → backend:8000
// Outside Docker (local dev without proxy): set VITE_API_URL in .env
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}`
  : "/api";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
});

// ------------------------------------------------------------------
// Types — mirror of backend schemas.py
// ------------------------------------------------------------------

export interface Facility {
  id:       number;
  name:     string;
  location: string | null;
  timezone: string;
}

export interface Asset {
  id:          number;
  facility_id: number;
  name:        string;
  asset_type:  string;
  description: string | null;
}

export interface FacilityDetail extends Facility {
  created_at: string;
  assets:     Asset[];
}

export interface MetricSummary {
  metric_name: string;
  unit:        string;
  total:       number;
  average:     number;
  min:         number;
  max:         number;
  asset_count: number;
  recorded_at: string;
}

export interface AssetLatestReading {
  asset_id:    number;
  asset_name:  string;
  asset_type:  string;
  metric_name: string;
  value:       number;
  unit:        string;
  recorded_at: string;
}

export interface FacilitySummary {
  facility_id:    number;
  facility_name:  string;
  as_of:          string;
  metrics:        MetricSummary[];
  asset_readings: AssetLatestReading[];
}

export interface SensorReading {
  id:          number;
  asset_id:    number;
  metric_name: string;
  value:       number;
  unit:        string;
  recorded_at: string;
}

export interface SensorReadingsResponse {
  total:  number;
  limit:  number;
  offset: number;
  data:   SensorReading[];
}

// ------------------------------------------------------------------
// API functions
// ------------------------------------------------------------------

export const fetchFacilities = async (): Promise<Facility[]> => {
  const { data } = await api.get("/facilities/");
  return data;
};

export const fetchFacilitySummary = async (
  facilityId: number
): Promise<FacilitySummary> => {
  const { data } = await api.get(`/facilities/${facilityId}/summary`);
  return data;
};

export const fetchSensorReadings = async (params: {
  facility_id?:  number;
  asset_id?:     number;
  metric_name?:  string;
  from_time?:    string;
  to_time?:      string;
  limit?:        number;
}): Promise<SensorReadingsResponse> => {
  const { data } = await api.get("/sensor-readings/", { params });
  return data;
};