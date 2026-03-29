"use client";

import Link from "next/link";
import type { UIBlock } from "./AIResponse";

interface UIBlocksProps {
  blocks: UIBlock[];
}

export default function UIBlocks({ blocks }: UIBlocksProps) {
  return (
    <div className="ui-blocks">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "stat_row":
            return <StatRow key={idx} items={block.items || []} />;
          case "allocation_chart":
            return <AllocationChart key={idx} data={block.data || {}} title={block.title} />;
          case "action_card":
            return <ActionCard key={idx} title={block.title || ""} description={block.description || ""} cta={block.cta} />;
          case "comparison_table":
            return <ComparisonTable key={idx} data={block.data || {}} title={block.title} />;
          case "timeline":
            return <TimelineBlock key={idx} items={block.items || []} title={block.title} />;
          case "alert":
            return <AlertBlock key={idx} title={block.title || ""} description={block.description || ""} variant={block.variant || "info"} />;
          case "key_value":
            return <KeyValueBlock key={idx} items={block.items || []} title={block.title} />;
          default:
            return null;
        }
      })}
    </div>
  );
}

function StatRow({ items }: { items: any[] }) {
  return (
    <div className="ui-stat-row">
      {items.map((item, i) => (
        <div className="ui-stat-item" key={i}>
          <div className="ui-stat-label">{item.label}</div>
          <div className="ui-stat-value">{item.value}</div>
          {item.change && (
            <div className={`ui-stat-change ${item.positive !== false ? "positive" : "negative"}`}>
              {item.change}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AllocationChart({ data, title }: { data: Record<string, number>; title?: string }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const colors = ["#f59e0b", "#3b82f6", "#ef4444", "#10b981", "#a855f7", "#f97316", "#6366f1", "#14b8a6"];
  return (
    <div className="ui-allocation">
      {title && <div className="ui-allocation-title">{title}</div>}
      <div className="ui-allocation-bar">
        {Object.entries(data).map(([key, val], i) => (
          <div
            key={key}
            className="ui-allocation-segment"
            style={{ width: `${(val / total) * 100}%`, background: colors[i % colors.length] }}
            title={`${key}: ${val}%`}
          />
        ))}
      </div>
      <div className="ui-allocation-legend">
        {Object.entries(data).map(([key, val], i) => (
          <div className="ui-allocation-legend-item" key={key}>
            <div className="ui-allocation-dot" style={{ background: colors[i % colors.length] }} />
            <span>{key}</span>
            <span className="ui-allocation-pct">{Math.round(val)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionCard({ title, description, cta }: { title: string; description: string; cta?: string }) {
  const content = (
    <div className="ui-action-card">
      <div className="ui-action-indicator" />
      <div className="ui-action-content">
        <div className="ui-action-title">{title}</div>
        <div className="ui-action-desc">{description}</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: 0.5 }}>
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  );
  if (cta) return <Link href={cta}>{content}</Link>;
  return content;
}

function ComparisonTable({ data, title }: { data: any; title?: string }) {
  const left = data.left || {};
  const right = data.right || {};
  const rows = data.rows || Object.keys({ ...left, ...right });
  return (
    <div className="ui-comparison">
      {title && <div className="ui-comparison-title">{title}</div>}
      <div className="ui-comparison-table">
        <div className="ui-comparison-header">
          <div>{data.left_label || "Option A"}</div>
          <div>{data.right_label || "Option B"}</div>
        </div>
        {rows.map((row: string) => (
          <div className="ui-comparison-row" key={row}>
            <div className="ui-comparison-cell">{left[row] ?? "-"}</div>
            <div className="ui-comparison-label">{row}</div>
            <div className="ui-comparison-cell">{right[row] ?? "-"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineBlock({ items, title }: { items: any[]; title?: string }) {
  return (
    <div className="ui-timeline">
      {title && <div className="ui-timeline-title">{title}</div>}
      {items.map((item, i) => (
        <div className="ui-timeline-item" key={i}>
          <div className="ui-timeline-dot" />
          <div className="ui-timeline-connector" />
          <div className="ui-timeline-content">
            <div className="ui-timeline-year">{item.year || item.label}</div>
            <div className="ui-timeline-text">{item.text || item.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertBlock({ title, description, variant }: { title: string; description: string; variant: string }) {
  const colors: Record<string, string> = {
    info: "#3b82f6",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
  };
  return (
    <div className="ui-alert" style={{ borderLeftColor: colors[variant] || colors.info }}>
      <div className="ui-alert-title" style={{ color: colors[variant] }}>{title}</div>
      <div className="ui-alert-desc">{description}</div>
    </div>
  );
}

function KeyValueBlock({ items, title }: { items: any[]; title?: string }) {
  return (
    <div className="ui-kv">
      {title && <div className="ui-kv-title">{title}</div>}
      {items.map((item, i) => (
        <div className="ui-kv-row" key={i}>
          <span className="ui-kv-key">{item.key || item.label}</span>
          <span className="ui-kv-val">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
