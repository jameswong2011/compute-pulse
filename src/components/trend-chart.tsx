"use client";

import { useMemo, useState } from "react";

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
  fill?: boolean;
}

const VIEW_W = 800;
const VIEW_H = 248;

function asNumber(value: string | number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function numericValues(
  data: Array<Record<string, string | number | null>>,
  series: ChartSeries[],
  stacked: boolean,
): number[] {
  if (stacked) {
    return data.map((row) =>
      series.reduce((sum, s) => sum + (asNumber(row[s.key]) ?? 0), 0),
    );
  }
  const out: number[] = [];
  for (const row of data) {
    for (const s of series) {
      const v = asNumber(row[s.key]);
      if (v != null) out.push(v);
    }
  }
  return out;
}

function niceDomain(
  values: number[],
  opts: { includeZero?: boolean; floorZero?: boolean },
): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 1 };
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (opts.includeZero) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }
  if (opts.floorZero) min = 0;
  if (min === max) {
    const pad = min === 0 ? 1 : Math.abs(min) * 0.12;
    return {
      min: opts.floorZero ? 0 : min - pad,
      max: max + pad,
    };
  }
  const span = max - min;
  if (!opts.floorZero) min = min - span * 0.1;
  max = max + span * 0.12;
  if (opts.includeZero) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }
  if (opts.floorZero) min = 0;
  return { min, max };
}

function ticks(min: number, max: number, count = 4): number[] {
  const span = max - min || 1;
  const step = span / count;
  return Array.from({ length: count + 1 }, (_, i) => min + step * i);
}

function xAt(i: number, n: number, padLeft: number, padRight: number): number {
  const inner = VIEW_W - padLeft - padRight;
  if (n <= 1) return padLeft + inner / 2;
  return padLeft + (i / (n - 1)) * inner;
}

function yAt(v: number, min: number, max: number): number {
  const inner = VIEW_H - 14 - 28;
  const t = (v - min) / (max - min || 1);
  return 14 + (1 - t) * inner;
}

function barBox(
  i: number,
  n: number,
  padLeft: number,
  padRight: number,
): { x: number; w: number } {
  const inner = VIEW_W - padLeft - padRight;
  const slot = n <= 0 ? inner : inner / n;
  const w = Math.max(2.4, slot * 0.78);
  const left = padLeft + slot * i + (slot - w) / 2;
  return { x: left, w };
}

function segmentsFor(
  data: Array<Record<string, string | number | null>>,
  key: string,
  min: number,
  max: number,
  xOf: (i: number) => number,
): number[][][] {
  const segs: number[][][] = [];
  let current: number[][] = [];
  data.forEach((row, i) => {
    const v = asNumber(row[key]);
    if (v != null) {
      current.push([xOf(i), yAt(v, min, max)]);
    } else if (current.length) {
      segs.push(current);
      current = [];
    }
  });
  if (current.length) segs.push(current);
  return segs;
}

function linePath(points: number[][]): string {
  return points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
}

function areaPath(points: number[][], baseline: number): string {
  if (points.length === 0) return "";
  const line = linePath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L${last[0].toFixed(1)} ${baseline.toFixed(1)} L${first[0].toFixed(1)} ${baseline.toFixed(1)} Z`;
}

export function TrendChart({
  data,
  series,
  yFormat,
  height = 280,
  variant = "line",
  overlay = [],
  overlayFormat,
}: {
  data: Array<Record<string, string | number | null>>;
  series: ChartSeries[];
  yFormat: (n: number) => string;
  height?: number;
  variant?: "line" | "stacked-bar";
  overlay?: ChartSeries[];
  overlayFormat?: (n: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const stacked = variant === "stacked-bar";
  const hasOverlay = overlay.length > 0;
  const padLeft = 56;
  const padRight = hasOverlay ? 56 : 14;

  const values = useMemo(
    () => numericValues(data, series, stacked),
    [data, series, stacked],
  );
  const overlayValues = useMemo(
    () => numericValues(data, overlay, false),
    [data, overlay],
  );
  const domain = useMemo(
    () =>
      niceDomain(values, {
        includeZero: !stacked,
        floorZero: stacked,
      }),
    [values, stacked],
  );
  const overlayDomain = useMemo(
    () => niceDomain(overlayValues, { includeZero: true, floorZero: false }),
    [overlayValues],
  );
  const yTicks = useMemo(
    () => ticks(domain.min, domain.max),
    [domain.min, domain.max],
  );
  const overlayTicks = useMemo(
    () => ticks(overlayDomain.min, overlayDomain.max),
    [overlayDomain.min, overlayDomain.max],
  );

  if (data.length === 0 || series.length === 0 || values.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No series for this window.
      </div>
    );
  }

  const baseline = yAt(0, domain.min, domain.max);
  const overlayZero = yAt(0, overlayDomain.min, overlayDomain.max);
  const xTicks = tickIndexes(data.length);
  const active = hover != null ? data[hover] : null;
  const stackOrder = [...series].reverse();
  const xOf = (i: number) =>
    stacked
      ? barBox(i, data.length, padLeft, padRight).x +
        barBox(i, data.length, padLeft, padRight).w / 2
      : xAt(i, data.length, padLeft, padRight);

  return (
    <div className="relative w-full min-w-0 overflow-visible">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        height={height}
        role="img"
        aria-label={stacked ? "Stacked bar chart" : "Trend chart"}
        className="block overflow-visible"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * VIEW_W;
          const inner = VIEW_W - padLeft - padRight;
          if (stacked) {
            const slot = inner / data.length;
            const i = Math.floor((px - padLeft) / slot);
            setHover(Math.max(0, Math.min(data.length - 1, i)));
            return;
          }
          const t = (px - padLeft) / inner;
          const i = Math.round(t * (data.length - 1));
          setHover(Math.max(0, Math.min(data.length - 1, i)));
        }}
      >
        {yTicks.map((tick) => {
          const y = yAt(tick, domain.min, domain.max);
          return (
            <g key={`l-${tick}`}>
              <line
                x1={padLeft}
                x2={VIEW_W - padRight}
                y1={y}
                y2={y}
                stroke="#5a5246"
                strokeWidth={1}
              />
              <text
                x={padLeft - 8}
                y={y + 3.5}
                textAnchor="end"
                fill="#c4b8a4"
                fontSize={11}
                fontFamily="ui-sans-serif, system-ui, sans-serif"
              >
                {yFormat(tick)}
              </text>
            </g>
          );
        })}

        {hasOverlay
          ? overlayTicks.map((tick) => {
              const y = yAt(tick, overlayDomain.min, overlayDomain.max);
              return (
                <text
                  key={`r-${tick}`}
                  x={VIEW_W - padRight + 8}
                  y={y + 3.5}
                  textAnchor="start"
                  fill="#f4efe4"
                  fontSize={11}
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                >
                  {(overlayFormat ?? yFormat)(tick)}
                </text>
              );
            })
          : null}

        {hasOverlay && overlayDomain.min < 0 && overlayDomain.max > 0 ? (
          <line
            x1={padLeft}
            x2={VIEW_W - padRight}
            y1={overlayZero}
            y2={overlayZero}
            stroke="#f4efe4"
            strokeOpacity={0.35}
            strokeWidth={1}
          />
        ) : domain.min < 0 && domain.max > 0 ? (
          <line
            x1={padLeft}
            x2={VIEW_W - padRight}
            y1={baseline}
            y2={baseline}
            stroke="#c4b8a4"
            strokeWidth={1.2}
          />
        ) : null}

        {xTicks.map((i) => (
          <text
            key={i}
            x={xOf(i)}
            y={VIEW_H - 8}
            textAnchor="middle"
            fill="#c4b8a4"
            fontSize={11}
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            {String(data[i]?.date ?? "")}
          </text>
        ))}

        {stacked
          ? data.map((row, i) => {
              const { x, w } = barBox(i, data.length, padLeft, padRight);
              let acc = 0;
              return (
                <g key={i}>
                  {stackOrder.map((s) => {
                    const v = asNumber(row[s.key]) ?? 0;
                    if (v <= 0) return null;
                    const y1 = yAt(acc, domain.min, domain.max);
                    const y2 = yAt(acc + v, domain.min, domain.max);
                    acc += v;
                    return (
                      <rect
                        key={s.key}
                        x={x}
                        y={y2}
                        width={w}
                        height={Math.max(0.5, y1 - y2)}
                        fill={s.color}
                        opacity={hover == null || hover === i ? 1 : 0.45}
                      />
                    );
                  })}
                </g>
              );
            })
          : series.map((s) => {
              const segs = segmentsFor(
                data,
                s.key,
                domain.min,
                domain.max,
                xOf,
              );
              const fill = s.fill !== false && !s.dashed;
              return (
                <g key={s.key}>
                  {fill
                    ? segs.map((pts, i) => (
                        <path
                          key={`a-${i}`}
                          d={areaPath(pts, baseline)}
                          fill={s.color}
                          fillOpacity={0.16}
                        />
                      ))
                    : null}
                  {segs.map((pts, i) => (
                    <path
                      key={`l-${i}`}
                      d={linePath(pts)}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={2.4}
                      strokeDasharray={s.dashed ? "6 5" : undefined}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  ))}
                </g>
              );
            })}

        {overlay.map((s) => {
          const segs = segmentsFor(
            data,
            s.key,
            overlayDomain.min,
            overlayDomain.max,
            xOf,
          );
          return (
            <g key={`ov-${s.key}`}>
              {segs.map((pts, i) => (
                <path
                  key={`ol-${i}`}
                  d={linePath(pts)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2.4}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}
            </g>
          );
        })}

        {hover != null ? (
          <line
            x1={xOf(hover)}
            x2={xOf(hover)}
            y1={14}
            y2={VIEW_H - 28}
            stroke="#e0c48a"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        ) : null}

        {overlay.map((s) => {
          const last = lastPoint(data, s.key);
          if (!last) return null;
          return (
            <circle
              key={`odot-${s.key}`}
              cx={xOf(last.i)}
              cy={yAt(last.v, overlayDomain.min, overlayDomain.max)}
              r={3.4}
              fill={s.color}
              stroke="#2a241c"
              strokeWidth={1.2}
            />
          );
        })}

        {!stacked
          ? series.map((s) => {
              const last = lastPoint(data, s.key);
              if (!last) return null;
              return (
                <circle
                  key={`dot-${s.key}`}
                  cx={xOf(last.i)}
                  cy={yAt(last.v, domain.min, domain.max)}
                  r={3.4}
                  fill={s.color}
                  stroke="#2a241c"
                  strokeWidth={1.2}
                />
              );
            })
          : null}
      </svg>

      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 px-1 text-xs text-muted-foreground">
        {[...series, ...overlay].map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2.5 rounded-[2px]"
              style={{
                background:
                  s.dashed || s.fill === false ? "transparent" : s.color,
                boxShadow:
                  s.dashed || s.fill === false
                    ? `inset 0 0 0 1.5px ${s.color}`
                    : undefined,
              }}
            />
            {s.label}
          </span>
        ))}
      </div>

      {active && hover != null ? (
        <div className="pointer-events-none absolute top-2 right-2 z-10 max-h-[240px] min-w-[168px] overflow-auto rounded-lg border border-border bg-popover/95 px-3 py-2 text-xs shadow-lg">
          <p className="mb-1 font-medium text-foreground">{String(active.date)}</p>
          {overlay.map((s) => {
            const v = asNumber(active[s.key]);
            return (
              <p key={s.key} className="flex justify-between gap-4 tabular">
                <span style={{ color: s.color }}>{s.label}</span>
                <span>
                  {v != null ? (overlayFormat ?? yFormat)(v) : "—"}
                </span>
              </p>
            );
          })}
          {stacked ? (
            <p className="my-1 flex justify-between gap-4 border-y border-border py-1 tabular">
              <span>Total</span>
              <span>
                {yFormat(
                  series.reduce(
                    (sum, s) => sum + (asNumber(active[s.key]) ?? 0),
                    0,
                  ),
                )}
              </span>
            </p>
          ) : null}
          {series.map((s) => {
            const v = asNumber(active[s.key]);
            return (
              <p key={s.key} className="flex justify-between gap-4 tabular">
                <span style={{ color: s.color }}>{s.label}</span>
                <span>{v != null ? yFormat(v) : "—"}</span>
              </p>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function tickIndexes(n: number): number[] {
  if (n <= 1) return [0];
  const count = Math.min(6, n);
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    out.push(Math.round((i / (count - 1)) * (n - 1)));
  }
  return [...new Set(out)];
}

function lastPoint(
  data: Array<Record<string, string | number | null>>,
  key: string,
): { i: number; v: number } | null {
  for (let i = data.length - 1; i >= 0; i--) {
    const v = asNumber(data[i]?.[key]);
    if (v != null) return { i, v };
  }
  return null;
}
