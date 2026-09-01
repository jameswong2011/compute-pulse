import { loadTokenPanel } from "@/lib/sources";

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get("refresh") === "1";
  const panel = await loadTokenPanel(force);
  return Response.json(panel);
}
