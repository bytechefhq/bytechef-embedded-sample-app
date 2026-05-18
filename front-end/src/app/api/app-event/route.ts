import { getToken } from "@/lib/api";
import { NextResponse } from "next/server";

const BYTECHEF_APP_BASE_URL =
  process.env.NEXT_PUBLIC_BYTECHEF_APP_BASE_URL || "http://localhost:5173";
const BYTECHEF_ENVIRONMENT =
  process.env.NEXT_PUBLIC_BYTECHEF_ENVIRONMENT || "DEVELOPMENT";

export async function POST(req: Request) {
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
    `${BYTECHEF_APP_BASE_URL}/api/embedded/v1/app-events`,
    {
      method: "POST",
      headers,
      body: body || undefined,
    }
  );

  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const text = await response.text();
  const data = text ? safeJson(text) : null;

  if (!response.ok) {
    return NextResponse.json(data ?? { message: response.statusText }, {
      status: response.status,
    });
  }

  return data == null
    ? new NextResponse(null, { status: response.status })
    : NextResponse.json(data, { status: response.status });
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
