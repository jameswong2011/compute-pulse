export const GPU_PATH_MONTHS = 6;

export function utcDay(now = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addUtcMonths(d: Date, months: number): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate()),
  );
}

export function eachUtcDay(start: Date, end: Date): string[] {
  const out: string[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
    out.push(isoDay(new Date(t)));
  }
  return out;
}

export function gpuPathWindow(now = new Date()): {
  start: string;
  end: string;
  dates: string[];
} {
  const end = utcDay(now);
  const start = addUtcMonths(end, -GPU_PATH_MONTHS);
  return {
    start: isoDay(start),
    end: isoDay(end),
    dates: eachUtcDay(start, end),
  };
}

/** Daily axis from the first priced day through the last, inclusive. */
export function observedGpuWindow(
  points: Array<{ date: string }>,
  now = new Date(),
): {
  start: string;
  end: string;
  dates: string[];
} {
  const fallback = gpuPathWindow(now);
  const datesPresent = points
    .map((p) => p.date)
    .filter((d) => d >= fallback.start)
    .sort();
  if (!datesPresent.length) return fallback;
  const start = datesPresent[0];
  const end = datesPresent.at(-1) ?? start;
  return {
    start,
    end,
    dates: eachUtcDay(
      utcDay(new Date(`${start}T00:00:00Z`)),
      utcDay(new Date(`${end}T00:00:00Z`)),
    ),
  };
}

export function snapshotDateFromPath(path: string): string | null {
  const match = path.match(/(\d{4}-\d{2}-\d{2})\.json$/);
  return match?.[1] ?? null;
}

/** ISO date of the Monday that starts the UTC week containing `iso`. */
export function mondayOfIso(iso: string): string {
  const day = utcDay(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
  const weekday = day.getUTCDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return isoDay(new Date(day.getTime() + offset * 86_400_000));
}
