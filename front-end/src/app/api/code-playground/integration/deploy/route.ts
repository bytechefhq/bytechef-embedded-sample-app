import { deployCodeWorkflow } from "@/app/api/code-playground/deploy";

// enable=true makes ByteChef create and enable (or move to the new version) the integration instance configuration in
// the X-Environment environment, so the integration shows up for connected users right away.
export async function POST(req: Request) {
  return deployCodeWorkflow(req, {
    defaultFileName: "playground_code_integration",
    fieldName: "integrationFile",
    path: "/integration-code-workflows/deploy?enable=true",
  });
}
