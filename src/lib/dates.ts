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

export function snapshotDateFromPath(path: string): string | null {
  const match = path.match(/(\d{4}-\d{2}-\d{2})\.json$/);
  return match?.[1] ?? null;
}
