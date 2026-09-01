import { gpuFamily } from "../format";
import { nowIso, slug } from "../http";
import type { GpuMarket, GpuQuote, SourceHealth } from "../types";

interface CatalogRow {
  provider: string;
  sourceId: string;
  gpu: string;
  vramGb: number;
  gpuCount: number;
  usdPerHour: number;
  market: GpuMarket;
  region?: string;
  url: string;
  asOf: string;
}

/**
 * Published list / rate-card prices from vendor pages. These are not
 * live marketplace asks. Each row cites a public pricing URL and as-of date.
 */
const ROWS: CatalogRow[] = [
  // Lambda Cloud — https://lambda.ai/service/gpu-cloud
  { provider: "Lambda", sourceId: "lambda", gpu: "A100 40GB", vramGb: 40, gpuCount: 1, usdPerHour: 1.99, market: "on_demand", region: "Lambda Cloud", url: "https://lambda.ai/service/gpu-cloud", asOf: "2026-08" },
  { provider: "Lambda", sourceId: "lambda", gpu: "A100 SXM 80GB", vramGb: 80, gpuCount: 1, usdPerHour: 2.79, market: "on_demand", region: "Lambda Cloud", url: "https://lambda.ai/service/gpu-cloud", asOf: "2026-08" },
  { provider: "Lambda", sourceId: "lambda", gpu: "H100 PCIe", vramGb: 80, gpuCount: 1, usdPerHour: 3.29, market: "on_demand", region: "Lambda Cloud", url: "https://lambda.ai/service/gpu-cloud", asOf: "2026-08" },
  { provider: "Lambda", sourceId: "lambda", gpu: "H100 SXM", vramGb: 80, gpuCount: 1, usdPerHour: 4.29, market: "on_demand", region: "Lambda Cloud", url: "https://lambda.ai/service/gpu-cloud", asOf: "2026-08" },
  { provider: "Lambda", sourceId: "lambda", gpu: "GH200", vramGb: 96, gpuCount: 1, usdPerHour: 2.29, market: "on_demand", region: "Lambda Cloud", url: "https://lambda.ai/service/gpu-cloud", asOf: "2026-08" },
  { provider: "Lambda", sourceId: "lambda", gpu: "B200", vramGb: 180, gpuCount: 1, usdPerHour: 6.69, market: "on_demand", region: "Lambda Cloud", url: "https://lambda.ai/service/gpu-cloud", asOf: "2026-08" },
  { provider: "Lambda", sourceId: "lambda", gpu: "RTX A6000", vramGb: 48, gpuCount: 1, usdPerHour: 1.09, market: "on_demand", region: "Lambda Cloud", url: "https://lambda.ai/service/gpu-cloud", asOf: "2026-08" },
  { provider: "Lambda", sourceId: "lambda", gpu: "V100", vramGb: 16, gpuCount: 1, usdPerHour: 0.79, market: "on_demand", region: "Lambda Cloud", url: "https://lambda.ai/service/gpu-cloud", asOf: "2026-08" },

  // AWS EC2 on-demand us-east-1
  { provider: "AWS", sourceId: "aws", gpu: "H100 SXM", vramGb: 80, gpuCount: 8, usdPerHour: 98.32, market: "on_demand", region: "us-east-1 · p5.48xlarge", url: "https://aws.amazon.com/ec2/pricing/on-demand/", asOf: "2026-01" },
  { provider: "AWS", sourceId: "aws", gpu: "H200", vramGb: 141, gpuCount: 8, usdPerHour: 143.71, market: "on_demand", region: "us-east-1 · p5e.48xlarge", url: "https://aws.amazon.com/ec2/instance-types/p5/", asOf: "2026-01" },
  { provider: "AWS", sourceId: "aws", gpu: "A100 40GB", vramGb: 40, gpuCount: 8, usdPerHour: 32.77, market: "on_demand", region: "us-east-1 · p4d.24xlarge", url: "https://aws.amazon.com/ec2/pricing/on-demand/", asOf: "2026-01" },
  { provider: "AWS", sourceId: "aws", gpu: "A100 80GB", vramGb: 80, gpuCount: 8, usdPerHour: 40.97, market: "on_demand", region: "us-east-1 · p4de.24xlarge", url: "https://aws.amazon.com/ec2/pricing/on-demand/", asOf: "2026-01" },
  { provider: "AWS", sourceId: "aws", gpu: "L4", vramGb: 24, gpuCount: 1, usdPerHour: 0.805, market: "on_demand", region: "us-east-1 · g6.xlarge", url: "https://aws.amazon.com/ec2/pricing/on-demand/", asOf: "2026-01" },
  { provider: "AWS", sourceId: "aws", gpu: "L40S", vramGb: 48, gpuCount: 1, usdPerHour: 1.86, market: "on_demand", region: "us-east-1 · g6e.xlarge", url: "https://aws.amazon.com/ec2/pricing/on-demand/", asOf: "2026-01" },
  { provider: "AWS", sourceId: "aws", gpu: "V100", vramGb: 16, gpuCount: 1, usdPerHour: 3.06, market: "on_demand", region: "us-east-1 · p3.2xlarge", url: "https://aws.amazon.com/ec2/pricing/on-demand/", asOf: "2026-01" },
  { provider: "AWS", sourceId: "aws", gpu: "T4", vramGb: 16, gpuCount: 1, usdPerHour: 0.526, market: "on_demand", region: "us-east-1 · g4dn.xlarge", url: "https://aws.amazon.com/ec2/pricing/on-demand/", asOf: "2026-01" },

  // Google Cloud
  { provider: "GCP", sourceId: "gcp", gpu: "H100 SXM", vramGb: 80, gpuCount: 8, usdPerHour: 88.49, market: "on_demand", region: "us-central1 · a3-highgpu-8g", url: "https://cloud.google.com/compute/gpus-pricing", asOf: "2026-01" },
  { provider: "GCP", sourceId: "gcp", gpu: "H200", vramGb: 141, gpuCount: 8, usdPerHour: 106.32, market: "on_demand", region: "us-central1 · a3-ultragpu-8g", url: "https://cloud.google.com/compute/gpus-pricing", asOf: "2026-01" },
  { provider: "GCP", sourceId: "gcp", gpu: "A100 40GB", vramGb: 40, gpuCount: 1, usdPerHour: 3.67, market: "on_demand", region: "us-central1 · a2-highgpu-1g", url: "https://cloud.google.com/compute/gpus-pricing", asOf: "2026-01" },
  { provider: "GCP", sourceId: "gcp", gpu: "A100 80GB", vramGb: 80, gpuCount: 1, usdPerHour: 5.03, market: "on_demand", region: "us-central1 · a2-ultragpu-1g", url: "https://cloud.google.com/compute/gpus-pricing", asOf: "2026-01" },
  { provider: "GCP", sourceId: "gcp", gpu: "L4", vramGb: 24, gpuCount: 1, usdPerHour: 0.70, market: "on_demand", region: "us-central1", url: "https://cloud.google.com/compute/gpus-pricing", asOf: "2026-01" },

  // Azure
  { provider: "Azure", sourceId: "azure", gpu: "H100 SXM", vramGb: 80, gpuCount: 8, usdPerHour: 98.32, market: "on_demand", region: "East US · ND-H100-v5", url: "https://azure.microsoft.com/pricing/details/virtual-machines/linux/", asOf: "2026-01" },
  { provider: "Azure", sourceId: "azure", gpu: "A100 80GB", vramGb: 80, gpuCount: 8, usdPerHour: 32.77, market: "on_demand", region: "East US · ND96amsr A100 v4", url: "https://azure.microsoft.com/pricing/details/virtual-machines/linux/", asOf: "2026-01" },
  { provider: "Azure", sourceId: "azure", gpu: "A10", vramGb: 24, gpuCount: 1, usdPerHour: 1.14, market: "on_demand", region: "East US · NV36ads A10 v5", url: "https://azure.microsoft.com/pricing/details/virtual-machines/linux/", asOf: "2026-01" },

  // CoreWeave
  { provider: "CoreWeave", sourceId: "coreweave", gpu: "H100 SXM", vramGb: 80, gpuCount: 1, usdPerHour: 4.76, market: "list", region: "CoreWeave Cloud", url: "https://www.coreweave.com/pricing", asOf: "2025-12" },
  { provider: "CoreWeave", sourceId: "coreweave", gpu: "H200", vramGb: 141, gpuCount: 1, usdPerHour: 6.50, market: "list", region: "CoreWeave Cloud", url: "https://www.coreweave.com/pricing", asOf: "2025-12" },
  { provider: "CoreWeave", sourceId: "coreweave", gpu: "B200", vramGb: 180, gpuCount: 1, usdPerHour: 8.80, market: "list", region: "CoreWeave Cloud", url: "https://www.coreweave.com/pricing", asOf: "2026-03" },
  { provider: "CoreWeave", sourceId: "coreweave", gpu: "L40S", vramGb: 48, gpuCount: 1, usdPerHour: 1.80, market: "list", region: "CoreWeave Cloud", url: "https://www.coreweave.com/pricing", asOf: "2025-12" },
  { provider: "CoreWeave", sourceId: "coreweave", gpu: "A100 80GB", vramGb: 80, gpuCount: 1, usdPerHour: 2.21, market: "list", region: "CoreWeave Cloud", url: "https://www.coreweave.com/pricing", asOf: "2025-12" },

  // Crusoe
  { provider: "Crusoe", sourceId: "crusoe", gpu: "H100 SXM", vramGb: 80, gpuCount: 1, usdPerHour: 3.95, market: "on_demand", region: "Crusoe Cloud", url: "https://www.crusoe.ai/cloud", asOf: "2026-02" },
  { provider: "Crusoe", sourceId: "crusoe", gpu: "H200", vramGb: 141, gpuCount: 1, usdPerHour: 4.75, market: "on_demand", region: "Crusoe Cloud", url: "https://www.crusoe.ai/cloud", asOf: "2026-02" },
  { provider: "Crusoe", sourceId: "crusoe", gpu: "A100 80GB", vramGb: 80, gpuCount: 1, usdPerHour: 1.65, market: "on_demand", region: "Crusoe Cloud", url: "https://www.crusoe.ai/cloud", asOf: "2026-02" },
  { provider: "Crusoe", sourceId: "crusoe", gpu: "L40S", vramGb: 48, gpuCount: 1, usdPerHour: 1.00, market: "on_demand", region: "Crusoe Cloud", url: "https://www.crusoe.ai/cloud", asOf: "2026-02" },

  // Voltage Park
  { provider: "Voltage Park", sourceId: "voltage-park", gpu: "H100 SXM", vramGb: 80, gpuCount: 1, usdPerHour: 1.99, market: "list", region: "Voltage Park", url: "https://www.voltagepark.com/pricing", asOf: "2025-11" },
  { provider: "Voltage Park", sourceId: "voltage-park", gpu: "H200", vramGb: 141, gpuCount: 1, usdPerHour: 2.49, market: "list", region: "Voltage Park", url: "https://www.voltagepark.com/pricing", asOf: "2026-02" },

  // Fluidstack
  { provider: "Fluidstack", sourceId: "fluidstack", gpu: "H100 SXM", vramGb: 80, gpuCount: 1, usdPerHour: 2.49, market: "on_demand", region: "Fluidstack", url: "https://www.fluidstack.io/pricing", asOf: "2025-12" },
  { provider: "Fluidstack", sourceId: "fluidstack", gpu: "H200", vramGb: 141, gpuCount: 1, usdPerHour: 2.99, market: "on_demand", region: "Fluidstack", url: "https://www.fluidstack.io/pricing", asOf: "2026-03" },
  { provider: "Fluidstack", sourceId: "fluidstack", gpu: "B200", vramGb: 180, gpuCount: 1, usdPerHour: 4.99, market: "on_demand", region: "Fluidstack", url: "https://www.fluidstack.io/pricing", asOf: "2026-03" },

  // Nebius
  { provider: "Nebius", sourceId: "nebius", gpu: "H100 SXM", vramGb: 80, gpuCount: 1, usdPerHour: 2.95, market: "on_demand", region: "eu-north1", url: "https://nebius.com/prices", asOf: "2026-02" },
  { provider: "Nebius", sourceId: "nebius", gpu: "H200", vramGb: 141, gpuCount: 1, usdPerHour: 3.50, market: "on_demand", region: "eu-north1", url: "https://nebius.com/prices", asOf: "2026-02" },
  { provider: "Nebius", sourceId: "nebius", gpu: "L40S", vramGb: 48, gpuCount: 1, usdPerHour: 1.20, market: "on_demand", region: "eu-north1", url: "https://nebius.com/prices", asOf: "2026-02" },
  { provider: "Nebius", sourceId: "nebius", gpu: "B200", vramGb: 180, gpuCount: 1, usdPerHour: 5.50, market: "on_demand", region: "eu-north1", url: "https://nebius.com/prices", asOf: "2026-06" },

  // Oracle Cloud
  { provider: "Oracle", sourceId: "oracle", gpu: "H100 SXM", vramGb: 80, gpuCount: 8, usdPerHour: 80.00, market: "on_demand", region: "BM.GPU.H100.8", url: "https://www.oracle.com/cloud/compute/pricing/", asOf: "2026-01" },
  { provider: "Oracle", sourceId: "oracle", gpu: "H200", vramGb: 141, gpuCount: 8, usdPerHour: 96.00, market: "on_demand", region: "BM.GPU.H200.8", url: "https://www.oracle.com/cloud/compute/pricing/", asOf: "2026-01" },
  { provider: "Oracle", sourceId: "oracle", gpu: "A100 80GB", vramGb: 80, gpuCount: 8, usdPerHour: 32.00, market: "on_demand", region: "BM.GPU.A100-v2.8", url: "https://www.oracle.com/cloud/compute/pricing/", asOf: "2026-01" },

  // DigitalOcean / Paperspace
  { provider: "DigitalOcean", sourceId: "digitalocean", gpu: "H100 SXM", vramGb: 80, gpuCount: 1, usdPerHour: 3.39, market: "on_demand", region: "Paperspace", url: "https://www.digitalocean.com/pricing/gpu-droplets", asOf: "2026-03" },
  { provider: "DigitalOcean", sourceId: "digitalocean", gpu: "L40S", vramGb: 48, gpuCount: 1, usdPerHour: 1.57, market: "on_demand", region: "Paperspace", url: "https://www.digitalocean.com/pricing/gpu-droplets", asOf: "2026-03" },
  { provider: "DigitalOcean", sourceId: "digitalocean", gpu: "RTX 4000 Ada", vramGb: 20, gpuCount: 1, usdPerHour: 0.76, market: "on_demand", region: "Paperspace", url: "https://www.digitalocean.com/pricing/gpu-droplets", asOf: "2026-03" },
  { provider: "DigitalOcean", sourceId: "digitalocean", gpu: "RTX 6000 Ada", vramGb: 48, gpuCount: 1, usdPerHour: 1.57, market: "on_demand", region: "Paperspace", url: "https://www.digitalocean.com/pricing/gpu-droplets", asOf: "2026-03" },

  // Salad
  { provider: "Salad", sourceId: "salad", gpu: "RTX 4090", vramGb: 24, gpuCount: 1, usdPerHour: 0.37, market: "spot", region: "SaladCloud", url: "https://salad.com/pricing", asOf: "2026-04" },
  { provider: "Salad", sourceId: "salad", gpu: "H100 SXM", vramGb: 80, gpuCount: 1, usdPerHour: 2.10, market: "spot", region: "SaladCloud", url: "https://salad.com/pricing", asOf: "2026-04" },
  { provider: "Salad", sourceId: "salad", gpu: "L40S", vramGb: 48, gpuCount: 1, usdPerHour: 0.65, market: "spot", region: "SaladCloud", url: "https://salad.com/pricing", asOf: "2026-04" },
  { provider: "Salad", sourceId: "salad", gpu: "RTX 3090", vramGb: 24, gpuCount: 1, usdPerHour: 0.16, market: "spot", region: "SaladCloud", url: "https://salad.com/pricing", asOf: "2026-04" },

  // Thunder Compute
  { provider: "Thunder Compute", sourceId: "thunder", gpu: "A100 80GB", vramGb: 80, gpuCount: 1, usdPerHour: 0.66, market: "on_demand", region: "Thunder", url: "https://www.thundercompute.com/pricing", asOf: "2026-03" },
  { provider: "Thunder Compute", sourceId: "thunder", gpu: "H100 SXM", vramGb: 80, gpuCount: 1, usdPerHour: 1.47, market: "on_demand", region: "Thunder", url: "https://www.thundercompute.com/pricing", asOf: "2026-03" },
  { provider: "Thunder Compute", sourceId: "thunder", gpu: "A100 40GB", vramGb: 40, gpuCount: 1, usdPerHour: 0.49, market: "on_demand", region: "Thunder", url: "https://www.thundercompute.com/pricing", asOf: "2026-03" },

  // Hyperstack
  { provider: "Hyperstack", sourceId: "hyperstack", gpu: "H100 SXM", vramGb: 80, gpuCount: 1, usdPerHour: 1.95, market: "on_demand", region: "CANADA-1", url: "https://www.hyperstack.cloud/gpu-pricing", asOf: "2026-02" },
  { provider: "Hyperstack", sourceId: "hyperstack", gpu: "L40", vramGb: 48, gpuCount: 1, usdPerHour: 0.90, market: "on_demand", region: "CANADA-1", url: "https://www.hyperstack.cloud/gpu-pricing", asOf: "2026-02" },
  { provider: "Hyperstack", sourceId: "hyperstack", gpu: "A100 80GB", vramGb: 80, gpuCount: 1, usdPerHour: 1.35, market: "on_demand", region: "CANADA-1", url: "https://www.hyperstack.cloud/gpu-pricing", asOf: "2026-02" },
  { provider: "Hyperstack", sourceId: "hyperstack", gpu: "RTX A6000", vramGb: 48, gpuCount: 1, usdPerHour: 0.50, market: "on_demand", region: "CANADA-1", url: "https://www.hyperstack.cloud/gpu-pricing", asOf: "2026-02" },

  // TensorDock
  { provider: "TensorDock", sourceId: "tensordock", gpu: "RTX 4090", vramGb: 24, gpuCount: 1, usdPerHour: 0.39, market: "on_demand", region: "Marketplace", url: "https://tensordock.com/pricing", asOf: "2026-01" },
  { provider: "TensorDock", sourceId: "tensordock", gpu: "A100 80GB", vramGb: 80, gpuCount: 1, usdPerHour: 1.29, market: "on_demand", region: "Marketplace", url: "https://tensordock.com/pricing", asOf: "2026-01" },
  { provider: "TensorDock", sourceId: "tensordock", gpu: "H100 SXM", vramGb: 80, gpuCount: 1, usdPerHour: 2.19, market: "on_demand", region: "Marketplace", url: "https://tensordock.com/pricing", asOf: "2026-01" },

  // Modal
  { provider: "Modal", sourceId: "modal", gpu: "H100 SXM", vramGb: 80, gpuCount: 1, usdPerHour: 3.95, market: "on_demand", region: "Modal", url: "https://modal.com/pricing", asOf: "2026-04" },
  { provider: "Modal", sourceId: "modal", gpu: "H200", vramGb: 141, gpuCount: 1, usdPerHour: 4.54, market: "on_demand", region: "Modal", url: "https://modal.com/pricing", asOf: "2026-04" },
  { provider: "Modal", sourceId: "modal", gpu: "B200", vramGb: 180, gpuCount: 1, usdPerHour: 6.18, market: "on_demand", region: "Modal", url: "https://modal.com/pricing", asOf: "2026-06" },
  { provider: "Modal", sourceId: "modal", gpu: "A100 80GB", vramGb: 80, gpuCount: 1, usdPerHour: 2.10, market: "on_demand", region: "Modal", url: "https://modal.com/pricing", asOf: "2026-04" },
  { provider: "Modal", sourceId: "modal", gpu: "L40S", vramGb: 48, gpuCount: 1, usdPerHour: 1.10, market: "on_demand", region: "Modal", url: "https://modal.com/pricing", asOf: "2026-04" },
  { provider: "Modal", sourceId: "modal", gpu: "T4", vramGb: 16, gpuCount: 1, usdPerHour: 0.59, market: "on_demand", region: "Modal", url: "https://modal.com/pricing", asOf: "2026-04" },

  // Together GPU / Instant Clusters (public rate card)
  { provider: "Together", sourceId: "together-gpu", gpu: "H100 SXM", vramGb: 80, gpuCount: 1, usdPerHour: 2.49, market: "on_demand", region: "Instant Cluster", url: "https://www.together.ai/pricing", asOf: "2026-03" },
  { provider: "Together", sourceId: "together-gpu", gpu: "H200", vramGb: 141, gpuCount: 1, usdPerHour: 2.99, market: "on_demand", region: "Instant Cluster", url: "https://www.together.ai/pricing", asOf: "2026-03" },
  { provider: "Together", sourceId: "together-gpu", gpu: "B200", vramGb: 180, gpuCount: 1, usdPerHour: 4.99, market: "on_demand", region: "Instant Cluster", url: "https://www.together.ai/pricing", asOf: "2026-06" },

  // Hugging Face Jobs / Inference Endpoints (GPU)
  { provider: "Hugging Face", sourceId: "huggingface", gpu: "A100 80GB", vramGb: 80, gpuCount: 1, usdPerHour: 2.50, market: "on_demand", region: "Inference Endpoints", url: "https://huggingface.co/pricing", asOf: "2026-02" },
  { provider: "Hugging Face", sourceId: "huggingface", gpu: "L40S", vramGb: 48, gpuCount: 1, usdPerHour: 1.80, market: "on_demand", region: "Inference Endpoints", url: "https://huggingface.co/pricing", asOf: "2026-02" },
  { provider: "Hugging Face", sourceId: "huggingface", gpu: "T4", vramGb: 16, gpuCount: 1, usdPerHour: 0.60, market: "on_demand", region: "Inference Endpoints", url: "https://huggingface.co/pricing", asOf: "2026-02" },

  // Replicate hardware
  { provider: "Replicate", sourceId: "replicate", gpu: "H100 SXM", vramGb: 80, gpuCount: 1, usdPerHour: 5.49, market: "on_demand", region: "Replicate", url: "https://replicate.com/pricing", asOf: "2026-03" },
  { provider: "Replicate", sourceId: "replicate", gpu: "A100 80GB", vramGb: 80, gpuCount: 1, usdPerHour: 5.04, market: "on_demand", region: "Replicate", url: "https://replicate.com/pricing", asOf: "2026-03" },
  { provider: "Replicate", sourceId: "replicate", gpu: "L40S", vramGb: 48, gpuCount: 1, usdPerHour: 2.30, market: "on_demand", region: "Replicate", url: "https://replicate.com/pricing", asOf: "2026-03" },
  { provider: "Replicate", sourceId: "replicate", gpu: "T4", vramGb: 16, gpuCount: 1, usdPerHour: 0.81, market: "on_demand", region: "Replicate", url: "https://replicate.com/pricing", asOf: "2026-03" },

  // Baseten
  { provider: "Baseten", sourceId: "baseten", gpu: "H100 SXM", vramGb: 80, gpuCount: 1, usdPerHour: 6.10, market: "on_demand", region: "Baseten", url: "https://www.baseten.co/pricing", asOf: "2026-02" },
  { provider: "Baseten", sourceId: "baseten", gpu: "A100 80GB", vramGb: 80, gpuCount: 1, usdPerHour: 3.66, market: "on_demand", region: "Baseten", url: "https://www.baseten.co/pricing", asOf: "2026-02" },
  { provider: "Baseten", sourceId: "baseten", gpu: "L4", vramGb: 24, gpuCount: 1, usdPerHour: 0.99, market: "on_demand", region: "Baseten", url: "https://www.baseten.co/pricing", asOf: "2026-02" },
];

const SOURCE_META: Record<
  string,
  { name: string; url: string; coverage: string; notes: string }
> = {
  lambda: {
    name: "Lambda Cloud",
    url: "https://lambda.ai/service/gpu-cloud",
    coverage: "On-demand 1x GPU list prices (API requires a key; catalog used)",
    notes: "Instance-types API is authenticated. Figures are the public rate card.",
  },
  aws: {
    name: "AWS EC2",
    url: "https://aws.amazon.com/ec2/pricing/on-demand/",
    coverage: "On-demand Linux list in us-east-1 for P5/P4/G6 families",
    notes: "Instance prices; divide by GPU count for per-GPU-hour.",
  },
  gcp: {
    name: "Google Cloud",
    url: "https://cloud.google.com/compute/gpus-pricing",
    coverage: "On-demand A3/A2/L4 list prices in us-central1",
    notes: "Does not include committed-use discounts.",
  },
  azure: {
    name: "Azure",
    url: "https://azure.microsoft.com/pricing/details/virtual-machines/linux/",
    coverage: "ND-H100-v5 and A100/A10 N-series list",
    notes: "East US Linux pay-as-you-go.",
  },
  coreweave: {
    name: "CoreWeave",
    url: "https://www.coreweave.com/pricing",
    coverage: "Published cloud GPU rate card",
    notes: "Contracted cluster rates often differ from the public card.",
  },
  crusoe: {
    name: "Crusoe Cloud",
    url: "https://www.crusoe.ai/cloud",
    coverage: "On-demand H100/H200/A100/L40S",
    notes: "Energy-first cloud; reserved pricing is lower.",
  },
  "voltage-park": {
    name: "Voltage Park",
    url: "https://www.voltagepark.com/pricing",
    coverage: "Public H100/H200 list",
    notes: "Typically sold as reserved clusters; listed hourly equivalent.",
  },
  fluidstack: {
    name: "Fluidstack",
    url: "https://www.fluidstack.io/pricing",
    coverage: "On-demand H100/H200/B200",
    notes: "Public self-serve rates.",
  },
  nebius: {
    name: "Nebius",
    url: "https://nebius.com/prices",
    coverage: "EU on-demand GPU VMs",
    notes: "eu-north1 list; US regions may differ.",
  },
  oracle: {
    name: "Oracle Cloud",
    url: "https://www.oracle.com/cloud/compute/pricing/",
    coverage: "Bare-metal H100/H200/A100 shapes",
    notes: "BM GPU shapes billed as the full node.",
  },
  digitalocean: {
    name: "DigitalOcean",
    url: "https://www.digitalocean.com/pricing/gpu-droplets",
    coverage: "GPU Droplets / Paperspace rate card",
    notes: "Includes L40S and Ada workstation GPUs.",
  },
  salad: {
    name: "SaladCloud",
    url: "https://salad.com/pricing",
    coverage: "Distributed consumer and datacenter GPUs",
    notes: "Interruptible residual capacity. Treat as spot.",
  },
  thunder: {
    name: "Thunder Compute",
    url: "https://www.thundercompute.com/pricing",
    coverage: "A100/H100 on-demand",
    notes: "Public self-serve hourly rates.",
  },
  hyperstack: {
    name: "Hyperstack",
    url: "https://www.hyperstack.cloud/gpu-pricing",
    coverage: "Canada-region on-demand GPUs",
    notes: "Spot inventory is often cheaper than the card.",
  },
  tensordock: {
    name: "TensorDock",
    url: "https://tensordock.com/pricing",
    coverage: "Host marketplace list",
    notes: "Host-set asks; listed figures are typical public rates.",
  },
  modal: {
    name: "Modal",
    url: "https://modal.com/pricing",
    coverage: "Serverless GPU seconds billed hourly-equivalent",
    notes: "Billed per second with no idle reservation.",
  },
  "together-gpu": {
    name: "Together Instant Clusters",
    url: "https://www.together.ai/pricing",
    coverage: "Instant GPU cluster rate card",
    notes: "Separate from Together inference token prices.",
  },
  huggingface: {
    name: "Hugging Face",
    url: "https://huggingface.co/pricing",
    coverage: "Inference Endpoints GPU SKUs",
    notes: "Dedicated endpoint hardware, not Jobs credits.",
  },
  replicate: {
    name: "Replicate",
    url: "https://replicate.com/pricing",
    coverage: "Hardware used for public models",
    notes: "Per-second hardware billing converted to hourly.",
  },
  baseten: {
    name: "Baseten",
    url: "https://www.baseten.co/pricing",
    coverage: "Model-serving GPU rates",
    notes: "Includes platform markup over raw cloud.",
  },
};

export function fetchCatalog(): {
  quotes: GpuQuote[];
  sources: SourceHealth[];
} {
  const fetchedAt = nowIso();
  const quotes: GpuQuote[] = ROWS.map((row) => ({
    id: slug(row.sourceId, row.gpu, row.market, row.region),
    sourceId: row.sourceId,
    provider: row.provider,
    gpu: row.gpu,
    family: gpuFamily(row.gpu),
    sku: row.region,
    vramGb: row.vramGb,
    gpuCount: row.gpuCount,
    usdPerHour: row.usdPerHour,
    usdPerGpuHour: row.usdPerHour / row.gpuCount,
    market: row.market,
    availability: "unknown",
    region: `${row.region} · as of ${row.asOf}`,
    live: false,
    fetchedAt,
    sourceUrl: row.url,
  }));

  const sources: SourceHealth[] = Object.entries(SOURCE_META).map(([id, meta]) => {
    const count = quotes.filter((q) => q.sourceId === id).length;
    return {
      id,
      name: meta.name,
      kind: "catalog",
      category: "gpus",
      status: "catalog",
      url: meta.url,
      coverage: meta.coverage,
      fetchedAt,
      quoteCount: count,
      notes: meta.notes,
    };
  });

  return { quotes, sources };
}
