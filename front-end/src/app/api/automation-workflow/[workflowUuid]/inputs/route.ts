import { forwardToByteChef } from "@/app/api/automation-workflow/forward";

interface RouteParams {
  params: Promise<{ workflowUuid: string }>;
}

export async function PUT(req: Request, { params }: RouteParams) {
  const { workflowUuid } = await params;

  return forwardToByteChef("PUT", `/automation/workflows/${encodeURIComponent(workflowUuid)}/inputs`, await req.text());
}
