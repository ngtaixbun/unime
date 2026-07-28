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

  return typeof value === "number" && Number.isFinite(value);
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

  return (
    PADDING_LEFT +
    (index * (SVG_WIDTH - PADDING_LEFT - PADDING_RIGHT)) /
      (count - 1)
  );
}

function toSvgY(value: number, min: number, max: number): number {
  const range = Math.max(max - min, 1);

  return PLOT_BOTTOM - ((value - min) / range) * PLOT_HEIGHT;
}

interface RenderSegment {
  linePath: string;
  areaPath: string;
  above: boolean;
}

function createRenderSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  benchmarkY: number,
  above: boolean,
): RenderSegment {
  const startX = x1.toFixed(1);
  const startY = y1.toFixed(1);
  const endX = x2.toFixed(1);
  const endY = y2.toFixed(1);
  const baseY = benchmarkY.toFixed(1);

  return {
    linePath: `M ${startX} ${startY} L ${endX} ${endY}`,
    areaPath:
      `M ${startX} ${baseY} ` +
      `L ${startX} ${startY} ` +
      `L ${endX} ${endY} ` +
      `L ${endX} ${baseY} Z`,
    above,
  };
}

function buildRenderSegments(
  points: TrendPoint[],
  min: number,
  max: number,
  benchmark: number,
): RenderSegment[] {
  const segments: RenderSegment[] = [];
  const benchmarkY = toSvgY(benchmark, min, max);

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];

    const x1 = toSvgX(index, points.length);
    const y1 = toSvgY(start.value, min, max);
    const x2 = toSvgX(index + 1, points.length);
    const y2 = toSvgY(end.value, min, max);

    const startAbove = start.value >= benchmark;
    const endAbove = end.value >= benchmark;

    if (startAbove === endAbove) {
      segments.push(
        createRenderSegment(
          x1,
          y1,
          x2,
          y2,
          benchmarkY,
          startAbove,
        ),
      );

      continue;
    }

    const valueDifference = end.value - start.value;

    if (valueDifference === 0) {
      segments.push(
        createRenderSegment(
          x1,
          y1,
          x2,
          y2,
          benchmarkY,
          startAbove,
        ),
      );

      continue;
    }

    const ratio =
      (benchmark - start.value) /
      valueDifference;

    const intersectX =
      x1 + ratio * (x2 - x1);

    segments.push(
      createRenderSegment(
        x1,
        y1,
        intersectX,
        benchmarkY,
        benchmarkY,
        startAbove,
      ),
    );

    segments.push(
      createRenderSegment(
        intersectX,
        benchmarkY,
        x2,
        y2,
        benchmarkY,
        endAbove,
      ),
    );
  }

  return segments;
}

function getMtdExtremaIndexes(values: number[]): number[] {
  if (values.length === 0) return [];

  let minValue = values[0];
  let maxValue = values[0];

  for (const value of values) {
    if (value < minValue) minValue = value;
    if (value > maxValue) maxValue = value;
  }

  const minIndex = values.indexOf(minValue);
  const maxIndex = values.indexOf(maxValue);

  if (minIndex === maxIndex) {
    return [minIndex];
  }

  return [minIndex, maxIndex];
}

export function Sparkline({
  points,
  title,
  mode,
}: SparklineProps) {
  const sortedPoints = sortByDate(
    points.filter(isValidPoint),
  );

  const validPoints =
    mode === "seven-days"
      ? sortedPoints.slice(-7)
      : sortedPoints;

  if (validPoints.length === 0) {
    return (
      <div
        className="memv2-spark mini"
        aria-label={`Xu hướng ${title}`}
      >
        <svg
          preserveAspectRatio="none"
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          role="img"
        >
          <title>{`Xu hướng ${title}`}</title>
        </svg>
      </div>
    );
  }

  const values = validPoints.map(
    (point) => point.value,
  );

  const pointWithBenchmark = validPoints.find(
    (point) =>
      typeof point.benchmark === "number" &&
      Number.isFinite(point.benchmark),
  );

  const benchmarkCandidate =
    pointWithBenchmark?.benchmark;

  const benchmark =
    typeof benchmarkCandidate === "number"
      ? benchmarkCandidate
      : values[0];

  const domainMin = Math.min(
    ...values,
    benchmark,
  );

  const domainMax = Math.max(
    ...values,
    benchmark,
  );

  const benchmarkY = toSvgY(
    benchmark,
    domainMin,
    domainMax,
  );

  const segments = buildRenderSegments(
    validPoints,
    domainMin,
    domainMax,
    benchmark,
  );

  const markerIndexes =
    mode === "mtd"
      ? getMtdExtremaIndexes(values)
      : validPoints.map((_, index) => index);

  const minIndex = values.indexOf(
    Math.min(...values),
  );

  const maxIndex = values.indexOf(
    Math.max(...values),
  );

  return (
    <div
      className="memv2-spark mini"
      aria-label={`Xu hướng ${title}`}
    >
      <svg
        preserveAspectRatio="none"
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        role="img"
      >
        <title>{`Xu hướng ${title}`}</title>

        <g className="areas" aria-hidden="true">
          {segments.map((segment, index) => (
            <path
              key={`area-${index}`}
              className={
                segment.above
                  ? "area-above"
                  : "area-below"
              }
              d={segment.areaPath}
            />
          ))}
        </g>

        <line
          className="benchmark"
          x1={PADDING_LEFT}
          x2={SVG_WIDTH - PADDING_RIGHT}
          y1={benchmarkY.toFixed(1)}
          y2={benchmarkY.toFixed(1)}
        />

        <g className="lines" aria-hidden="true">
          {segments.map((segment, index) => (
            <path
              key={`line-${index}`}
              className={
                segment.above
                  ? "line-above"
                  : "line-below"
              }
              d={segment.linePath}
            />
          ))}
        </g>

        <g className="markers">
          {markerIndexes.map((index) => {
            const point = validPoints[index];

            if (!point) return null;

            const x = toSvgX(
              index,
              validPoints.length,
            );

            const y = toSvgY(
              point.value,
              domainMin,
              domainMax,
            );

            let markerClass =
              point.value >= benchmark
                ? "above"
                : "below";

            if (mode === "mtd") {
              if (minIndex === maxIndex) {
                markerClass = "max-marker";
              } else if (index === minIndex) {
                markerClass = "min-marker";
              } else if (index === maxIndex) {
                markerClass = "max-marker";
              }
            }

            return (
              <circle
                className={markerClass}
                cx={x.toFixed(1)}
                cy={y.toFixed(1)}
                key={`marker-${index}`}
                r="1.65"
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
