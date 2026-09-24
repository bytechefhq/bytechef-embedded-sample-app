import { forwardToByteChef } from "@/app/api/automation-workflow/forward";

interface RouteParams {
  params: Promise<{ workflowUuid: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  const { workflowUuid } = await params;

  const body = await req.text();

  return forwardToByteChef(
    "POST",
    `/automation/workflow-templates/${encodeURIComponent(workflowUuid)}/provision`,
    body || undefined
  );
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { workflowUuid } = await params;

  return forwardToByteChef("DELETE", `/automation/workflow-templates/${encodeURIComponent(workflowUuid)}/provision`);
}
