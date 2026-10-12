import { BYTECHEF_APP_BASE_URL, BYTECHEF_ENVIRONMENT } from "@/lib/config";
import { getPlatformApiKey } from "@/lib/server-config";
import { NextResponse } from "next/server";

interface DeployRequestI {
  fileName?: unknown;
  source?: unknown;
}

interface DeployCodeWorkflowOptionsI {
  defaultFileName: string;
  fieldName: string;
  path: string;
}

// Uploads the posted source as a `.js` file to a ByteChef code workflow deploy endpoint. The request is authenticated
// with the server-only platform API key, never with the connected-user JWT: deploying is an administrator operation.
export async function deployCodeWorkflow(
  req: Request,
  { defaultFileName, fieldName, path }: DeployCodeWorkflowOptionsI
): Promise<NextResponse> {
  const platformApiKey = getPlatformApiKey();

  if (!platformApiKey) {
    return NextResponse.json(
      {
        message:
          "BYTECHEF_PLATFORM_API_KEY is not configured. Add an administrator's Embedded API key to front-end/.env.local and restart the app.",
      },
      { status: 501 }
    );
  }

  let deployRequest: DeployRequestI;

  try {
    deployRequest = (await req.json()) as DeployRequestI;
  } catch {
    return NextResponse.json({ message: "The request body must be JSON: {source, fileName?}." }, { status: 400 });
  }

  const { fileName, source } = deployRequest;

  if (typeof source !== "string" || !source.trim()) {
    return NextResponse.json({ message: "The source is empty." }, { status: 400 });
  }

  const formData = new FormData();

  formData.append(
    fieldName,
    new Blob([source], { type: "text/javascript" }),
    toJavaScriptFileName(typeof fileName === "string" ? fileName : "", defaultFileName)
  );

  let response: Response;

  try {
    response = await fetch(`${BYTECHEF_APP_BASE_URL}/api/embedded/v1${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${platformApiKey}`,
        "X-Environment": BYTECHEF_ENVIRONMENT,
      },
      body: formData,
      cache: "no-store",
    });
  } catch (fetchError) {
    return NextResponse.json(
      {
        message: `Could not reach ByteChef at ${BYTECHEF_APP_BASE_URL}: ${
          fetchError instanceof Error ? fetchError.message : String(fetchError)
        }`,
      },
      { status: 502 }
    );
  }

  const responseBody = await response.text();
  const responseContentType = response.headers.get("content-type") ?? "application/json";

  if (response.status === 204 || response.status === 304) {
    return new NextResponse(null, { status: response.status });
  }

  return new NextResponse(responseBody || null, {
    status: response.status,
    headers: { "Content-Type": responseContentType },
  });
}

// The server picks the code workflow language from the uploaded file's extension, so the name always ends in `.js`.
function toJavaScriptFileName(fileName: string, defaultFileName: string): string {
  const baseName = (fileName.split(/[\\/]/).pop() ?? "")
    .replace(/\.js$/i, "")
    .replace(/[^A-Za-z0-9_-]/g, "_")
    .replace(/^_+|_+$/g, "");

  return `${baseName || defaultFileName}.js`;
}
