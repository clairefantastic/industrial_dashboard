/**
 * App.tsx — Root dashboard component.
 *
 * Layout:
 *   Header (facility selector + status bar)
 *   KPIGrid (4 metric cards)
 *   TimeSeriesChart (line chart)
 *   AssetTable (per-asset latest readings)
 */

import { useState } from "react";
import { ConfigProvider, Select, Spin, Alert, theme } from "antd";
import { SyncOutlined } from "@ant-design/icons";
import { QueryClient, QueryClientProvider, useIsFetching } from "@tanstack/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { useFacilities, useFacilitySummary } from "./hooks/useFacility";
import { KPIGrid }          from "./components/KPIGrid";
import { TimeSeriesChart }  from "./components/TimeSeriesChart";
import { AssetTable }       from "./components/AssetTable";

dayjs.extend(relativeTime);

// ------------------------------------------------------------------
// Ant Design dark theme tokens
// ------------------------------------------------------------------
const antTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorBgBase:       "#0a0e14",
    colorBgContainer:  "#0d1117",
    colorBgElevated:   "#161b22",
    colorBorder:       "#1e2530",
    colorText:         "#e2e8f0",
    colorTextSecondary:"#8899aa",
    colorPrimary:      "#39ff14",
    fontFamily:        "'Barlow', sans-serif",
    borderRadius:       4,
  },
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry:              2,
      refetchOnWindowFocus: false,
    },
  },
});

// ------------------------------------------------------------------
// Inner dashboard (needs QueryClient context)
// ------------------------------------------------------------------
function Dashboard() {
  const [facilityId, setFacilityId] = useState<number | null>(null);
  const isFetching = useIsFetching();

  const { data: facilities, isLoading: facilitiesLoading } = useFacilities();
  const { data: summary,    isLoading: summaryLoading, isError } =
    useFacilitySummary(facilityId);

  // Auto-select first facility once loaded
  if (facilities && facilities.length > 0 && facilityId === null) {
    setFacilityId(facilities[0].id);
  }

  return (
    <div style={styles.root}>
      {/* ── HEADER ── */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>
            <span style={styles.logoMark}>◈</span>
            <span style={styles.logoText}>INDUSTRIAL DASHBOARD</span>
          </div>
          <div style={styles.facilitySelector}>
            <span style={styles.selectorLabel}>FACILITY</span>
            <Select
              loading={facilitiesLoading}
              value={facilityId}
              onChange={setFacilityId}
              options={facilities?.map((f) => ({ value: f.id, label: f.name }))}
              style={{ width: 260 }}
              placeholder="Select facility…"
              variant="borderless"
            />
          </div>
        </div>

        <div style={styles.headerRight}>
          {isFetching > 0 && (
            <span style={styles.fetchingBadge}>
              <SyncOutlined spin style={{ marginRight: 6 }} />
              SYNCING
            </span>
          )}
          {summary && (
            <span style={styles.asOf}>
              AS OF {dayjs(summary.as_of).format("HH:mm:ss")}
            </span>
          )}
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main style={styles.main}>
        {summaryLoading && facilityId && (
          <div style={styles.center}>
            <Spin size="large" tip="Loading plant data…" />
          </div>
        )}

        {isError && (
          <Alert
            type="error"
            message="Failed to load facility data"
            description="Check that the backend is running and the database is seeded."
            style={styles.alert}
          />
        )}

        {!facilityId && !facilitiesLoading && (
          <div style={styles.center}>
            <span style={styles.placeholder}>Select a facility to begin</span>
          </div>
        )}

        {summary && !summaryLoading && (
          <>
            {/* Facility name + location */}
            <div style={styles.facilityTitle}>
              <h1 style={styles.h1}>{summary.facility_name}</h1>
              <span style={styles.assetCount}>
                {summary.asset_readings.length > 0
                  ? `${new Set(summary.asset_readings.map(r => r.asset_id)).size} assets reporting`
                  : "No assets"}
              </span>
            </div>

            <KPIGrid summary={summary} />

            <TimeSeriesChart
              facilityId={facilityId!}
              assetIds={[...new Set(summary.asset_readings.map(r => r.asset_id))]}
            />

            <AssetTable summary={summary} />
          </>
        )}
      </main>
    </div>
  );
}

// ------------------------------------------------------------------
// Root — wraps with providers
// ------------------------------------------------------------------
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={antTheme}>
        <Dashboard />
      </ConfigProvider>
    </QueryClientProvider>
  );
}

// ------------------------------------------------------------------
// Styles
// ------------------------------------------------------------------
const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight:  "100vh",
    background: "#0a0e14",
    color:      "#e2e8f0",
  },
  header: {
    display:         "flex",
    justifyContent:  "space-between",
    alignItems:      "center",
    padding:         "0 32px",
    height:          "64px",
    background:      "#0d1117",
    borderBottom:    "1px solid #1e2530",
    position:        "sticky",
    top:             0,
    zIndex:          100,
  },
  headerLeft: {
    display:    "flex",
    alignItems: "center",
    gap:        "32px",
  },
  logo: {
    display:    "flex",
    alignItems: "center",
    gap:        "10px",
  },
  logoMark: {
    fontSize: "20px",
    color:    "#39ff14",
  },
  logoText: {
    fontFamily:    "'Barlow Condensed', sans-serif",
    fontSize:      "14px",
    fontWeight:    700,
    letterSpacing: "3px",
    color:         "#e2e8f0",
  },
  facilitySelector: {
    display:    "flex",
    alignItems: "center",
    gap:        "8px",
  },
  selectorLabel: {
    fontFamily:    "'Barlow Condensed', sans-serif",
    fontSize:      "10px",
    letterSpacing: "2px",
    color:         "#8899aa",
    fontWeight:    600,
  },
  headerRight: {
    display:    "flex",
    alignItems: "center",
    gap:        "16px",
  },
  fetchingBadge: {
    fontFamily:    "'Barlow Condensed', sans-serif",
    fontSize:      "11px",
    letterSpacing: "1px",
    color:         "#39ff14",
    display:       "flex",
    alignItems:    "center",
  },
  asOf: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize:   "11px",
    color:      "#2d3748",
  },
  main: {
    maxWidth: "1400px",
    margin:   "0 auto",
    padding:  "32px 32px",
  },
  facilityTitle: {
    display:      "flex",
    alignItems:   "baseline",
    gap:          "16px",
    marginBottom: "24px",
  },
  h1: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize:   "28px",
    fontWeight: 700,
    color:      "#e2e8f0",
    margin:     0,
    letterSpacing: "1px",
  },
  assetCount: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize:   "13px",
    color:      "#8899aa",
    letterSpacing: "1px",
  },
  center: {
    display:        "flex",
    justifyContent: "center",
    alignItems:     "center",
    height:         "400px",
  },
  placeholder: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize:   "18px",
    color:      "#2d3748",
    letterSpacing: "2px",
  },
  alert: {
    marginBottom: "24px",
  },
};