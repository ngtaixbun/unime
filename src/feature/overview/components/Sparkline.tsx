import type { TrendPoint } from "../types";

interface SparklineProps {
  points: TrendPoint[];
  title: string;
  mode: "seven-days" | "mtd";
}

interface PlotPoint {
  x: number;
  y: number;
  value: number;
}

interface RenderSegment {
  linePath: string;
  areaPath: string;
  above: boolean;
}

const SVG_WIDTH = 112;
const SVG_HEIGHT = 30;
const PADDING_LEFT = 4;
const PADDING_RIGHT = 4;
const PLOT_TOP = 5;
const PLOT_BOTTOM = 25;
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP;
const SAMPLES_PER_SEGMENT = 8;

function isValidPoint(point: unknown): point is TrendPoint {
  if (point == null || typeof point !== "object") return false;

  const { value } = point as TrendPoint;

  return typeof value === "number" && Number.isFinite(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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

function catmullRom(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number,
): number {
  const t2 = t * t;
  const t3 = t2 * t;

  return (
    0.5 *
    ((2 * p1) +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

function buildAnchorPoints(
  points: TrendPoint[],
  min: number,
  max: number,
): PlotPoint[] {
  return points.map((point, index) => ({
    x: toSvgX(index, points.length),
    y: toSvgY(point.value, min, max),
    value: point.value,
  }));
}

function buildSmoothPlotPoints(
  points: TrendPoint[],
  min: number,
  max: number,
): PlotPoint[] {
  const anchors = buildAnchorPoints(points, min, max);

  if (anchors.length <= 2) {
    return anchors;
  }

  const minX = PADDING_LEFT;
  const maxX = SVG_WIDTH - PADDING_RIGHT;

  const samples: PlotPoint[] = [anchors[0]];

  for (let index = 0; index < anchors.length - 1; index += 1) {
    const p0 = anchors[Math.max(index - 1, 0)];
    const p1 = anchors[index];
    const p2 = anchors[index + 1];
    const p3 = anchors[Math.min(index + 2, anchors.length - 1)];

    for (let step = 1; step <= SAMPLES_PER_SEGMENT; step += 1) {
      const t = step / SAMPLES_PER_SEGMENT;

      const x = clamp(
        catmullRom(p0.x, p1.x, p2.x, p3.x, t),
        minX,
        maxX,
      );

      const value = catmullRom(
        p0.value,
        p1.value,
        p2.value,
        p3.value,
        t,
      );

      const y = clamp(
        toSvgY(value, min, max),
        PLOT_TOP,
        PLOT_BOTTOM,
      );

      samples.push({ x, y, value });
    }
  }

  return samples;
}

function createRenderSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  benchmarkY: number,
  above: boolean,
): RenderSegment {
  const startX = x1.toFixed(2);
  const startY = y1.toFixed(2);
  const endX = x2.toFixed(2);
  const endY = y2.toFixed(2);
  const baseY = benchmarkY.toFixed(2);

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
  samples: PlotPoint[],
  benchmark: number,
  benchmarkY: number,
): RenderSegment[] {
  const segments: RenderSegment[] = [];

  for (let index = 0; index < samples.length - 1; index += 1) {
    const start = samples[index];
    const end = samples[index + 1];

    const startAbove = start.value >= benchmark;
    const endAbove = end.value >= benchmark;

    if (startAbove === endAbove) {
      segments.push(
        createRenderSegment(
          start.x,
          start.y,
          end.x,
          end.y,
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
          start.x,
          start.y,
          end.x,
          end.y,
          benchmarkY,
          startAbove,
        ),
      );

      continue;
    }

    const ratio =
      (benchmark - start.value) / valueDifference;

    const intersectX =
      start.x + ratio * (end.x - start.x);

    segments.push(
      createRenderSegment(
        start.x,
        start.y,
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
        end.x,
        end.y,
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

  const smoothSamples = buildSmoothPlotPoints(
    validPoints,
    domainMin,
    domainMax,
  );

  const anchorPoints = buildAnchorPoints(
    validPoints,
    domainMin,
    domainMax,
  );

  const segments = buildRenderSegments(
    smoothSamples,
    benchmark,
    benchmarkY,
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

        <line
          className="benchmark"
          x1={PADDING_LEFT}
          x2={SVG_WIDTH - PADDING_RIGHT}
          y1={benchmarkY.toFixed(2)}
          y2={benchmarkY.toFixed(2)}
        />

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
            const anchor = anchorPoints[index];

            if (!point || !anchor) return null;

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
                cx={anchor.x.toFixed(2)}
                cy={anchor.y.toFixed(2)}
                key={`marker-${index}`}
                r="1.45"
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
