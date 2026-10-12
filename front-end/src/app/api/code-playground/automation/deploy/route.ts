import { deployCodeWorkflow } from "@/app/api/code-playground/deploy";

export async function POST(req: Request) {
  return deployCodeWorkflow(req, {
    defaultFileName: "playground_catalog_code_project",
    fieldName: "projectFile",
    path: "/automation-project-code-workflows/deploy",
  });
}
