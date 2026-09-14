import { getToken } from "@/lib/api";
import { BYTECHEF_APP_BASE_URL, BYTECHEF_ENVIRONMENT } from "@/lib/config";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ workflowUuid: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  const { workflowUuid } = await params;

  const jwtToken = await getToken();

  const body = await req.text();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${jwtToken}`,
    "X-Environment": BYTECHEF_ENVIRONMENT,
  };

  const contentType = req.headers.get("content-type");

  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  const response = await fetch(
    `${BYTECHEF_APP_BASE_URL}/api/embedded/v1/workflows/${encodeURIComponent(workflowUuid)}`,
    {
      method: "POST",
      headers,
      body: body || undefined,
    }
  );

  const responseBody = await response.text();
  const responseContentType = response.headers.get("content-type") ?? "application/json";

  return new NextResponse(responseBody, {
    status: response.status,
    headers: { "Content-Type": responseContentType },
  });
}
