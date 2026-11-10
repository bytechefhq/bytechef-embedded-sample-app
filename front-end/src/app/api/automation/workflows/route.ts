import { forwardToByteChef } from "@/app/api/automation/forward";

export async function GET() {
  return forwardToByteChef("GET", "/automation/workflows");
}
