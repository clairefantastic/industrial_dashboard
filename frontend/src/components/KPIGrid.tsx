/**
 * KPIGrid.tsx — Four prominent metric cards at the top of the dashboard.
 * Shows total power, total output, average temperature, average pressure.
 */

import { ThunderboltOutlined, RocketOutlined, FireOutlined, DashboardOutlined } from "@ant-design/icons";
import type { FacilitySummary, MetricSummary } from "../api/client";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

interface KPIGridProps {
  summary: FacilitySummary;
}

interface CardConfig {
  metric:   string;
  label:    string;
  icon:     React.ReactNode;
  color:    string;
  getValue: (m: MetricSummary) => string;
  getUnit:  (m: MetricSummary) => string;
}

const CARD_CONFIG: CardConfig[] = [
  {
    metric:   "power",
    label:    "TOTAL POWER",
    icon:     <ThunderboltOutlined />,
    color:    "#39ff14",
    getValue: (m) => m.total.toLocaleString("en-US", { maximumFractionDigits: 0 }),
    getUnit:  (m) => m.unit,
  },
  {
    metric:   "output",
    label:    "TOTAL OUTPUT",
    icon:     <RocketOutlined />,
    color:    "#00d4ff",
    getValue: (m) => m.total.toLocaleString("en-US", { maximumFractionDigits: 0 }),
    getUnit:  (m) => m.unit,
  },
  {
    metric:   "temperature",
    label:    "AVG TEMPERATURE",
    icon:     <FireOutlined />,
    color:    "#ff6b35",
    getValue: (m) => m.average.toLocaleString("en-US", { maximumFractionDigits: 1 }),
    getUnit:  (m) => m.unit,
  },
  {
    metric:   "pressure",
    label:    "AVG PRESSURE",
    icon:     <DashboardOutlined />,
    color:    "#bf5fff",
    getValue: (m) => m.average.toLocaleString("en-US", { maximumFractionDigits: 1 }),
    getUnit:  (m) => m.unit,
  },
];

export const KPIGrid = ({ summary }: KPIGridProps) => {
  const metricMap = new Map(summary.metrics.map((m) => [m.metric_name, m]));

  return (
    <div style={styles.grid}>
      {CARD_CONFIG.map((cfg) => {
        const metric = metricMap.get(cfg.metric);
        if (!metric) return null;

        return (
          <div key={cfg.metric} style={{ ...styles.card, borderColor: cfg.color + "40" }}>
            {/* top row: label + icon */}
            <div style={styles.cardHeader}>
              <span style={styles.label}>{cfg.label}</span>
              <span style={{ ...styles.icon, color: cfg.color }}>{cfg.icon}</span>
            </div>

            {/* big number */}
            <div style={styles.valueRow}>
              <span style={{ ...styles.value, color: cfg.color }}>
                {cfg.getValue(metric)}
              </span>
              <span style={styles.unit}>{cfg.getUnit(metric)}</span>
            </div>

            {/* sub-stats */}
            <div style={styles.subStats}>
              <span style={styles.subStat}>
                ↓ {metric.min.toLocaleString("en-US", { maximumFractionDigits: 1 })}
              </span>
              <span style={styles.subStat}>
                {metric.asset_count} assets
              </span>
              <span style={styles.subStat}>
                ↑ {metric.max.toLocaleString("en-US", { maximumFractionDigits: 1 })}
              </span>
            </div>

            {/* updated at */}
            <div style={styles.updatedAt}>
              {dayjs(metric.recorded_at).fromNow()}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display:             "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap:                 "16px",
    marginBottom:        "24px",
  },
  card: {
    background:   "#0d1117",
    border:       "1px solid #1e2530",
    borderRadius: "4px",
    padding:      "20px",
    position:     "relative",
    overflow:     "hidden",
    transition:   "border-color 0.3s ease",
  },
  cardHeader: {
    display:        "flex",
    justifyContent: "space-between",
    alignItems:     "center",
    marginBottom:   "12px",
  },
  label: {
    fontFamily:    "'Barlow Condensed', sans-serif",
    fontSize:      "11px",
    letterSpacing: "2px",
    color:         "#8899aa",
    fontWeight:    600,
  },
  icon: {
    fontSize: "18px",
  },
  valueRow: {
    display:    "flex",
    alignItems: "baseline",
    gap:        "8px",
    marginBottom: "12px",
  },
  value: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize:   "36px",
    fontWeight: 400,
    lineHeight: 1,
  },
  unit: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize:   "14px",
    color:      "#8899aa",
    fontWeight: 400,
  },
  subStats: {
    display:        "flex",
    justifyContent: "space-between",
    marginBottom:   "8px",
  },
  subStat: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize:   "11px",
    color:      "#8899aa",
  },
  updatedAt: {
    fontFamily: "'Barlow', sans-serif",
    fontSize:   "10px",
    color:      "#6b7a8d",
    textAlign:  "right",
  },
};