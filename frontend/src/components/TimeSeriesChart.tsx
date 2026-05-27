/**
 * TimeSeriesChart.tsx — Line chart showing a chosen metric over time.
 * Uses Recharts + React Query auto-refresh.
 */

import { useState } from "react";
import { Select, Segmented, Spin, Empty } from "antd";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import dayjs from "dayjs";
import { useReadings, type TimeRange } from "../hooks/useReadings";
import type { SensorReading } from "../api/client";

interface TimeSeriesChartProps {
  facilityId: number;
  assetIds:   number[];
}

const METRICS = [
  { value: "power",       label: "Power Consumption" },
  { value: "output",      label: "Output Rate" },
  { value: "temperature", label: "Temperature" },
  { value: "pressure",    label: "Pressure" },
];

const METRIC_COLORS: Record<string, string> = {
  power:       "#39ff14",
  output:      "#00d4ff",
  temperature: "#ff6b35",
  pressure:    "#bf5fff",
};

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: "1H",  value: "1h"  },
  { label: "2H",  value: "2h"  },
  { label: "6H",  value: "6h"  },
  { label: "24H", value: "24h" },
];

// Aggregate readings from multiple assets by timestamp (sum values)
function aggregateReadings(readings: SensorReading[]) {
  const buckets = new Map<string, { time: string; value: number; count: number }>();

  for (const r of readings) {
    // Round to nearest minute for grouping
    const key = dayjs(r.recorded_at).startOf("minute").toISOString();
    const existing = buckets.get(key);
    if (existing) {
      existing.value += r.value;
      existing.count += 1;
    } else {
      buckets.set(key, {
        time:  dayjs(r.recorded_at).format("HH:mm"),
        value: r.value,
        count: 1,
      });
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((b) => ({ time: b.time, value: parseFloat(b.value.toFixed(2)) }));
}

// Custom Recharts tooltip styled for dark theme
const CustomTooltip = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={styles.tooltip}>
      <div style={styles.tooltipTime}>{label}</div>
      <div style={styles.tooltipValue}>
        {payload[0].value.toLocaleString()} {unit}
      </div>
    </div>
  );
};

export const TimeSeriesChart = ({ facilityId }: TimeSeriesChartProps) => {
  const [metric,    setMetric]    = useState("power");
  const [timeRange, setTimeRange] = useState<TimeRange>("2h");

  const activeRange: TimeRange = timeRange;

  const { data, isLoading, isError } = useReadings({
    facilityId,
    metricName: metric,
    timeRange:  activeRange,
  });

  const chartData = data ? aggregateReadings(data.data) : [];
  const color     = METRIC_COLORS[metric] ?? "#39ff14";
  const unit      = data?.data?.[0]?.unit ?? "";

  // Compute mean for reference line
  const mean = chartData.length
    ? chartData.reduce((s, d) => s + d.value, 0) / chartData.length
    : null;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.sectionLabel}>TIME SERIES</div>
          <Select
            value={metric}
            onChange={setMetric}
            options={METRICS}
            style={{ width: 200, marginTop: 4 }}
            variant="borderless"
            styles={{ popup: { root: { background: "#0d1117" } } }}
          />
        </div>

        <Segmented
          value={activeRange}
          onChange={(v) => setTimeRange(v as TimeRange)}
          options={TIME_RANGES}
          style={styles.segmented}
        />
      </div>

      {/* Chart area */}
      <div style={styles.chartWrapper}>
        {isLoading && (
          <div style={styles.center}>
            <Spin size="large" />
          </div>
        )}
        {isError && (
          <div style={styles.center}>
            <Empty description="Failed to load data" />
          </div>
        )}
        {!isLoading && !isError && chartData.length === 0 && (
          <div style={styles.center}>
            <Empty description="No data in this time range" />
          </div>
        )}
        {!isLoading && !isError && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
              <XAxis
                dataKey="time"
                tick={{ fontFamily: "'Share Tech Mono'", fontSize: 11, fill: "#8899aa" }}
                axisLine={{ stroke: "#1e2530" }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontFamily: "'Share Tech Mono'", fontSize: 11, fill: "#8899aa" }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip content={<CustomTooltip unit={unit} />} />
              {mean !== null && (
                <ReferenceLine
                  y={parseFloat(mean.toFixed(2))}
                  stroke={color + "60"}
                  strokeDasharray="4 4"
                  label={{ value: "avg", fill: color + "80", fontSize: 10 }}
                />
              )}
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: color }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={styles.footer}>
        {data && (
          <span style={styles.footerText}>
            {data.total} readings · auto-refreshes every 30s
          </span>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    background:   "#0d1117",
    border:       "1px solid #1e2530",
    borderRadius: "4px",
    padding:      "20px",
    marginBottom: "24px",
  },
  header: {
    display:        "flex",
    justifyContent: "space-between",
    alignItems:     "flex-start",
    marginBottom:   "20px",
  },
  sectionLabel: {
    fontFamily:    "'Barlow Condensed', sans-serif",
    fontSize:      "11px",
    letterSpacing: "2px",
    color:         "#8899aa",
    fontWeight:    600,
  },
  segmented: {
    background: "#161b22",
    color:      "#8899aa",
  },
  chartWrapper: {
    position: "relative",
    minHeight: "280px",
  },
  center: {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    height:         "280px",
  },
  footer: {
    marginTop:  "12px",
    textAlign:  "right",
  },
  footerText: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize:   "10px",
    color:      "#6b7a8d",
  },
  tooltip: {
    background:   "#161b22",
    border:       "1px solid #1e2530",
    borderRadius: "4px",
    padding:      "8px 12px",
  },
  tooltipTime: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize:   "11px",
    color:      "#8899aa",
    marginBottom: "4px",
  },
  tooltipValue: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize:   "16px",
    color:      "#e2e8f0",
  },
};