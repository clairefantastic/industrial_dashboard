/**
 * AssetTable.tsx — Table showing every asset's latest sensor readings.
 * Groups by asset, one row per asset with all metrics as columns.
 */

import { Table, Tag } from "antd";
import type { FacilitySummary, AssetLatestReading } from "../api/client";
import dayjs from "dayjs";

interface AssetTableProps {
  summary: FacilitySummary;
}

interface AssetRow {
  key:         string;
  asset_id:    number;
  asset_name:  string;
  asset_type:  string;
  temperature?: number;
  pressure?:   number;
  power?:      number;
  output?:     number;
  units:       Record<string, string>;
  recorded_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  turbine:    "green",
  boiler:     "orange",
  pump:       "blue",
  reactor:    "red",
  compressor: "purple",
  exchanger:  "cyan",
  assembly:   "geekblue",
  cnc:        "magenta",
  finishing:  "gold",
};

export const AssetTable = ({ summary }: AssetTableProps) => {
  // Pivot: group asset_readings by asset_id
  const assetMap = new Map<number, AssetRow>();

  for (const r of summary.asset_readings) {
    if (!assetMap.has(r.asset_id)) {
      assetMap.set(r.asset_id, {
        key:        String(r.asset_id),
        asset_id:   r.asset_id,
        asset_name: r.asset_name,
        asset_type: r.asset_type,
        units:      {},
        recorded_at: r.recorded_at,
      });
    }
    const row = assetMap.get(r.asset_id)!;
    (row as any)[r.metric_name] = r.value;
    row.units[r.metric_name]    = r.unit;

    // Keep latest timestamp
    if (r.recorded_at > row.recorded_at) row.recorded_at = r.recorded_at;
  }

  const dataSource = Array.from(assetMap.values()).sort(
    (a, b) => a.asset_name.localeCompare(b.asset_name)
  );

  const columns = [
    {
      title:     "ASSET",
      dataIndex: "asset_name",
      key:       "asset_name",
      render: (name: string, row: AssetRow) => (
        <div>
          <div style={styles.assetName}>{name}</div>
          <Tag color={TYPE_COLORS[row.asset_type] ?? "default"} style={styles.tag}>
            {row.asset_type}
          </Tag>
        </div>
      ),
    },
    {
      title:     "POWER",
      dataIndex: "power",
      key:       "power",
      align:     "right" as const,
      render: (v: number | undefined, row: AssetRow) =>
        v !== undefined ? (
          <span style={{ ...styles.metric, color: "#39ff14" }}>
            {v.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            <span style={styles.metricUnit}> {row.units.power}</span>
          </span>
        ) : <span style={styles.na}>—</span>,
    },
    {
      title:     "OUTPUT",
      dataIndex: "output",
      key:       "output",
      align:     "right" as const,
      render: (v: number | undefined, row: AssetRow) =>
        v !== undefined ? (
          <span style={{ ...styles.metric, color: "#00d4ff" }}>
            {v.toLocaleString("en-US", { maximumFractionDigits: 1 })}
            <span style={styles.metricUnit}> {row.units.output}</span>
          </span>
        ) : <span style={styles.na}>—</span>,
    },
    {
      title:     "TEMP",
      dataIndex: "temperature",
      key:       "temperature",
      align:     "right" as const,
      render: (v: number | undefined, row: AssetRow) =>
        v !== undefined ? (
          <span style={{ ...styles.metric, color: "#ff6b35" }}>
            {v.toLocaleString("en-US", { maximumFractionDigits: 1 })}
            <span style={styles.metricUnit}> {row.units.temperature}</span>
          </span>
        ) : <span style={styles.na}>—</span>,
    },
    {
      title:     "PRESSURE",
      dataIndex: "pressure",
      key:       "pressure",
      align:     "right" as const,
      render: (v: number | undefined, row: AssetRow) =>
        v !== undefined ? (
          <span style={{ ...styles.metric, color: "#bf5fff" }}>
            {v.toLocaleString("en-US", { maximumFractionDigits: 1 })}
            <span style={styles.metricUnit}> {row.units.pressure}</span>
          </span>
        ) : <span style={styles.na}>—</span>,
    },
    {
      title:     "LAST SEEN",
      dataIndex: "recorded_at",
      key:       "recorded_at",
      align:     "right" as const,
      render: (v: string) => (
        <span style={styles.timestamp}>
          {dayjs(v).format("HH:mm:ss")}
        </span>
      ),
    },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.sectionLabel}>ASSET STATUS</div>
      <Table
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        size="small"
        style={styles.table}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    background:   "#0d1117",
    border:       "1px solid #1e2530",
    borderRadius: "4px",
    padding:      "20px",
  },
  sectionLabel: {
    fontFamily:    "'Barlow Condensed', sans-serif",
    fontSize:      "11px",
    letterSpacing: "2px",
    color:         "#4a5568",
    fontWeight:    600,
    marginBottom:  "16px",
  },
  assetName: {
    fontFamily: "'Barlow', sans-serif",
    fontWeight: 500,
    color:      "#e2e8f0",
    fontSize:   "13px",
  },
  tag: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize:   "10px",
    letterSpacing: "1px",
    border:     "none",
    marginTop:  "2px",
  },
  metric: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize:   "13px",
  },
  metricUnit: {
    fontSize: "10px",
    color:    "#4a5568",
  },
  na: {
    color:      "#2d3748",
    fontFamily: "'Share Tech Mono', monospace",
  },
  timestamp: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize:   "12px",
    color:      "#4a5568",
  },
  table: {
    background: "transparent",
  },
};