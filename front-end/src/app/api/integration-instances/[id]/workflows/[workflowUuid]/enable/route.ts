import { forwardToByteChef } from "@/app/api/automation-workflow/forward";

interface RouteParams {
  params: Promise<{ id: string; workflowUuid: string }>;
}

export async function POST(_req: Request, { params }: RouteParams) {
  const { id, workflowUuid } = await params;

  return forwardToByteChef(
    "POST",
    `/integration-instances/${encodeURIComponent(id)}/workflows/${encodeURIComponent(workflowUuid)}/enable`
  );
}
