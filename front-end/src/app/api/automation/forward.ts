import { getToken } from "@/lib/api";
import { BYTECHEF_APP_BASE_URL, BYTECHEF_ENVIRONMENT } from "@/lib/config";
import { NextResponse } from "next/server";

export async function forwardToByteChef(method: string, path: string, body?: string): Promise<NextResponse> {
  const jwtToken = await getToken();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${jwtToken}`,
    "X-Environment": BYTECHEF_ENVIRONMENT,
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${BYTECHEF_APP_BASE_URL}/api/embedded/v1${path}`, {
    method,
    headers,
    body: body || undefined,
  });

  const responseBody = await response.text();
  const responseContentType = response.headers.get("content-type") ?? "application/json";

  return new NextResponse(responseBody || null, {
    status: response.status,
    headers: { "Content-Type": responseContentType },
  });
}
