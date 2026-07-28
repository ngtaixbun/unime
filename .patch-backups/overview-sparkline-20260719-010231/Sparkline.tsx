import type { TrendPoint } from "../types";

interface SparklineProps {
  points: TrendPoint[];
  title: string;
  mode: "seven-days" | "mtd";
}

const SVG_WIDTH = 112;
const SVG_HEIGHT = 30;
const PADDING_LEFT = 4;
const PADDING_RIGHT = 4;
const PLOT_TOP = 6;
const PLOT_BOTTOM = 26;
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP;

function isValidPoint(point: unknown): point is TrendPoint {
  if (point == null || typeof point !== "object") return false;
  const { value } = point as TrendPoint;
  return typeof value === "number" && !Number.isNaN(value);
}

function sortByDate(points: TrendPoint[]): TrendPoint[] {
  return [...points].sort((a, b) => {
    if (a.date && b.date) {
      return a.date.localeCompare(b.date);
    }
    return 0;
  });
}

function toSvgX(index: number, count: number): number {
  if (count <= 1) return SVG_WIDTH / 2;
  return PADDING_LEFT + (index * (SVG_WIDTH - PADDING_LEFT - PADDING_RIGHT)) / (count - 1);
}

function toSvgY(value: number, min: number, max: number): number {
  const range = Math.max(max - min, 1);
  return PLOT_BOTTOM - ((value - min) / range) * PLOT_HEIGHT;
}

interface Segment {
  d: string;
  above: boolean;
}

function buildSegments(
  points: TrendPoint[],
  min: number,
  max: number,
  benchmark: number,
): Segment[] {
  const segments: Segment[] = [];

  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    const x1 = toSvgX(i, points.length);
    const y1 = toSvgY(start.value, min, max);
    const x2 = toSvgX(i + 1, points.length);
    const y2 = toSvgY(end.value, min, max);
    const benchmarkY = toSvgY(benchmark, min, max);

    const startAbove = start.value >= benchmark;
    const endAbove = end.value >= benchmark;

    if (startAbove === endAbove) {
      segments.push({
        d: `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`,
        above: startAbove,
      });
      continue;
    }

    const ratio = (benchmark - start.value) / (end.value - start.value);
    const intersectX = x1 + ratio * (x2 - x1);

    segments.push({
      d: `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${intersectX.toFixed(1)} ${benchmarkY.toFixed(1)}`,
      above: startAbove,
    });
    segments.push({
      d: `M ${intersectX.toFixed(1)} ${benchmarkY.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`,
      above: endAbove,
    });
  }

  return segments;
}

function buildAreaAbovePath(
  points: TrendPoint[],
  min: number,
  max: number,
  benchmark: number,
): string {
  const benchmarkY = toSvgY(benchmark, min, max);
  const vertices: string[] = [];
  let insideAbove = false;

  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    const x = toSvgX(i, points.length);
    const y = toSvgY(point.value, min, max);
    const above = point.value >= benchmark;

    if (above) {
      if (!insideAbove) {
        if (i > 0) {
          const prev = points[i - 1];
          const prevX = toSvgX(i - 1, points.length);
          const prevY = toSvgY(prev.value, min, max);
          const ratio = (benchmark - prev.value) / (point.value - prev.value);
          const intersectX = prevX + ratio * (x - prevX);
          vertices.push(`${intersectX.toFixed(1)} ${benchmarkY.toFixed(1)}`);
        }
        insideAbove = true;
      }
      vertices.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
    } else if (insideAbove) {
      const prev = points[i - 1];
      const prevX = toSvgX(i - 1, points.length);
      const prevY = toSvgY(prev.value, min, max);
      const ratio = (benchmark - prev.value) / (point.value - prev.value);
      const intersectX = prevX + ratio * (x - prevX);
      vertices.push(`${intersectX.toFixed(1)} ${benchmarkY.toFixed(1)}`);
      insideAbove = false;
    }
  }

  if (vertices.length === 0) return "";

  const first = vertices[0].split(" ")[0];
  const last = vertices[vertices.length - 1].split(" ")[0];
  vertices.push(`${last} ${benchmarkY.toFixed(1)}`);
  vertices.push(`${first} ${benchmarkY.toFixed(1)}`);

  return `M ${vertices.join(" L ")} Z`;
}

function getMtdExtremaIndexes(values: number[]): number[] {
  if (values.length === 0) return [];

  let min = values[0];
  let max = values[0];
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }

  const minIndex = values.indexOf(min);
  const maxIndex = values.indexOf(max);

  if (minIndex === maxIndex) return [minIndex];
  return [minIndex, maxIndex];
}

export function Sparkline({ points, title, mode }: SparklineProps) {
  const validPoints = sortByDate(points.filter(isValidPoint));

  if (validPoints.length === 0) {
    return (
      <div className="memv2-spark mini" aria-label={`Xu hướng ${title}`}>
        <svg preserveAspectRatio="none" viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} role="img">
          <title>{`Xu hướng ${title}`}</title>
        </svg>
      </div>
    );
  }

  const values = validPoints.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  const benchmark = validPoints[0]?.benchmark ?? values[0];
  const benchmarkY = toSvgY(benchmark, min, max);

  const segments = buildSegments(validPoints, min, max, benchmark);
  const areaAbovePath = buildAreaAbovePath(validPoints, min, max, benchmark);

  const markerIndexes =
    mode === "mtd"
      ? getMtdExtremaIndexes(values)
      : validPoints.map((_, index) => index);

  return (
    <div className="memv2-spark mini" aria-label={`Xu hướng ${title}`}>
      <svg preserveAspectRatio="none" viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} role="img">
        <title>{`Xu hướng ${title}`}</title>
        <line
          className="benchmark"
          x1={PADDING_LEFT}
          x2={SVG_WIDTH - PADDING_RIGHT}
          y1={benchmarkY.toFixed(1)}
          y2={benchmarkY.toFixed(1)}
        />
        {areaAbovePath ? <path className="area-above" d={areaAbovePath} /> : null}
        {segments.map((segment, index) => (
          <path
            key={`segment-${index}`}
            className={segment.above ? "line-above" : "line-below"}
            d={segment.d}
          />
        ))}
        <g className="markers">
          {markerIndexes.map((index) => {
            const point = validPoints[index];
            const x = toSvgX(index, validPoints.length);
            const y = toSvgY(point.value, min, max);
            const above = point.value >= benchmark;
            const isMtd = mode === "mtd";
            let markerClass = above ? "above" : "below";
            if (isMtd) {
              const minIndex = values.indexOf(Math.min(...values));
              const maxIndex = values.indexOf(Math.max(...values));
              if (index === minIndex) markerClass = "min-marker";
              if (index === maxIndex) markerClass = "max-marker";
              if (minIndex === maxIndex) markerClass = "max-marker";
            }
            return <circle className={markerClass} cx={x.toFixed(1)} cy={y.toFixed(1)} key={`marker-${index}`} r="1.6" />;
          })}
        </g>
      </svg>
    </div>
  );
}
