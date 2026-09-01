import type { GpuLane, GpuMarket } from "./types";

export function marketFromKind(kind: string): GpuMarket | null {
  switch (kind) {
    case "secure":
      return "secure";
    case "on-demand":
    case "on_demand":
      return "on_demand";
    case "community":
      return "community";
    case "spot":
      return "spot";
    case "reserved":
      return "reserved";
    default:
      return null;
  }
}

export function laneFromKind(kind: string): GpuLane | null {
  const market = marketFromKind(kind);
  if (!market) return null;
  return market === "secure" || market === "reserved" ? "secure" : "on_demand";
}

/** Price-path SKUs. Other marketplace cards stay on the live tape. */
export const PATH_GPUS = ["H100", "H200", "B200", "B200+", "A100"] as const;
export type PathGpu = (typeof PATH_GPUS)[number];

export function isPathGpu(name: string): name is PathGpu {
  return (PATH_GPUS as readonly string[]).includes(name);
}

export function cohortGpu(name: string): string | null {
  const n = name
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/^nvidia[\s-]*/, "")
    .trim();
  if (n.startsWith("h100")) return "H100";
  if (n.startsWith("h200")) return "H200";
  if (n.startsWith("b200")) return "B200";
  if (n.startsWith("b300") || n.startsWith("gb200") || n.startsWith("gb300"))
    return "B200+";
  if (n.startsWith("a100")) return "A100";
  if (n.startsWith("l40s")) return "L40S";
  if (n.includes("4090")) return "4090";
  if (n.includes("5090")) return "5090";
  if (n.startsWith("mi300")) return "MI300X";
  return null;
}

export function pathCohortGpu(name: string): PathGpu | null {
  const gpu = cohortGpu(name);
  return gpu && isPathGpu(gpu) ? gpu : null;
}
