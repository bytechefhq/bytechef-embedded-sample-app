import { forwardToByteChef } from "@/app/api/automation-workflow/forward";

export async function GET() {
  return forwardToByteChef("GET", "/automation/projects");
}
