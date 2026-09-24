import { forwardToByteChef } from "@/app/api/automation-workflow/forward";

interface RouteParams {
  params: Promise<{ workflowUuid: string }>;
}

export async function POST(_req: Request, { params }: RouteParams) {
  const { workflowUuid } = await params;

  return forwardToByteChef("POST", `/automation/workflows/${encodeURIComponent(workflowUuid)}/enable`);
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { workflowUuid } = await params;

  return forwardToByteChef("DELETE", `/automation/workflows/${encodeURIComponent(workflowUuid)}/enable`);
}
