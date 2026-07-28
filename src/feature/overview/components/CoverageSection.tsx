import type { CoverageMetric } from "../types";
import { CoverageCard } from "./CoverageCard";

interface CoverageSectionProps {
  metrics: CoverageMetric[];
  onSelectMetric: (metricId: string) => void;
}

export function CoverageSection({ metrics, onSelectMetric }: CoverageSectionProps) {
  return (
    <div className="memv2-coverage-pair">
      {metrics.map((metric) => (
        <CoverageCard key={metric.id} metric={metric} onSelect={onSelectMetric} />
      ))}
    </div>
  );
}
