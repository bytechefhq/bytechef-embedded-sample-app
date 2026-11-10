import { forwardToByteChef } from "@/app/api/automation/forward";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;

  return forwardToByteChef("GET", `/integrations/${encodeURIComponent(id)}`);
}
