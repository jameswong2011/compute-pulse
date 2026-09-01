# Meridian

A research panel for **token consumption**, **token prices**, and **GPU rentals**, drawn from public sources.

Meridian is a desk, not a broker. It leads with paths over time: the running pile of tokens consumed on OpenRouter, week-on-week change in that flow, and daily GPU medians split **on-demand vs secure**. Spot quotes and vendor rate cards stay on the tape. Catalog rows are list prices, not a promise of capacity.

## What it tracks

### Token consumption

A stacked running total of every prompt and completion token from the public [OpenRouter rankings](https://openrouter.ai/rankings) chart, with week-on-week change overlaid, plus this week's mix of prompt, completion, and reasoning. Cite as: Source: OpenRouter (openrouter.ai/rankings).

### Token forms

Input, output, cache read, cache write (including 1-hour TTL), reasoning, audio in/out/cache, image in/out/token, video, embeddings, rerank, OCR, web search, and per-request surcharges. Where a provider splits **batch**, **flex**, **priority**, or **long-context** rates, those tiers stay on the tape.

Live token sources:

- [OpenRouter models API](https://openrouter.ai/api/v1/models) — 400+ models with the full public pricing object
- [LiteLLM price table](https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json) — provider-native rates, including embeddings and batch/flex/priority

### GPU rentals

USD per GPU-hour, normalized from instance price ÷ GPU count, **split on-demand vs secure**.

Daily price paths come from the public [GPU Rental Prices](https://huggingface.co/datasets/gpurentalprices/gpu-rental-prices) snapshot window (CC BY 4.0). On-demand includes list, community, and spot. Secure is secure-cloud and reserved.

Live GPU sources:

- [RunPod GraphQL `gpuTypes`](https://api.runpod.io/graphql) — secure, community, spot, reserved
- [Vast.ai bundles](https://console.vast.ai/api/v0/bundles/) — rentable marketplace floor and median for research SKUs

Catalog rate cards (dated, linked):

Lambda, AWS, Azure, GCP, CoreWeave, Crusoe, Voltage Park, Fluidstack, Nebius, Oracle, DigitalOcean/Paperspace, Salad, Thunder Compute, Hyperstack, TensorDock, Modal, Together Instant Clusters, Hugging Face Inference Endpoints, Replicate, and Baseten.

Lambda’s instance-types API requires a key, so Lambda stays on the catalog until one is provided.

## Run it

```bash
npm install
npm run dev
```

The app listens on [http://127.0.0.1:43173](http://127.0.0.1:43173).

No API keys are required. Spot feeds cache for five minutes; consumption and GPU history cache for thirty. If a live source fails, the panel marks it and keeps every other feed.

## Pages

| Route | What you get |
| --- | --- |
| `/` | Cumulative stacked consumption with week-on-week overlay, GPU on-demand vs secure path, then the spot tape |
| `/tokens` | Cumulative stack with week-on-week overlay, this week's mix, then every billed token form |
| `/gpus` | Daily median path, then on-demand and secure rails |
| `/compare` | Workload cost and GPU-versus-API sketch |
| `/sources` | Source health, coverage, and methodology |

## Notes

- Token prices are shown **per million tokens** unless the native unit is an image, page, search, or request.
- Vast.ai quotes are the cheapest rentable on-demand ask (and the median when the spread is wide), not an SLA.
- Compare-page decode rates are conservative 70B-class estimates, not measured throughput.
- Committed-use discounts, egress, and private RFQs are out of scope.
