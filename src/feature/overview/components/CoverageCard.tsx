import { Store, Users } from "lucide-react";

import { formatInteger, formatPercent } from "../lib";
import type { CoverageMetric } from "../types";

interface CoverageCardProps {
  metric: CoverageMetric;
  onSelect: (metricId: string) => void;
}

export function CoverageCard({ metric, onSelect }: CoverageCardProps) {
  const Icon = metric.id === "store" ? Store : Users;
  const gap = Math.max(100 - metric.percent, 0);
  const missing = Math.max(metric.target - metric.actual, 0);

  return (
    <button type="button" className="memv2-cover-card" onClick={() => onSelect(metric.id)}>
      <span className="memv2-cover-top">
        <Icon aria-hidden="true" />
        <b>{metric.title}</b>
        <span aria-hidden="true">›</span>
      </span>
      <span className="memv2-cover-pct">
        <b>{formatPercent(metric.percent)}</b>
      </span>
      <span className="memv2-cover-nums">
        <strong>{formatInteger(metric.actual)}</strong>
        <i>/</i>
        <em>{formatInteger(metric.target)}</em>
      </span>
      <span className="memv2-cover-bar" aria-hidden="true">
        <span className="actual" style={{ width: `${metric.percent}%` }} />
        <span className="gap" style={{ width: `${gap}%` }} />
      </span>
      <span className="memv2-cover-gap">
        Còn thiếu: {formatInteger(missing)} {metric.missingLabel}
      </span>
    </button>
  );
}
