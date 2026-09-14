import { getToken } from "@/lib/api";
import { BYTECHEF_APP_BASE_URL, BYTECHEF_ENVIRONMENT, BYTECHEF_EXTERNAL_USER_ID } from "@/lib/config";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const {
    actionName,
    componentName,
    componentVersion,
    input,
  }: {
    actionName: string;
    componentName: string;
    componentVersion: number;
    input: Record<string, unknown>;
  } = await req.json();

  const jwtToken = await getToken();

  const response = await fetch(
    `${BYTECHEF_APP_BASE_URL}/api/embedded/v1/${BYTECHEF_EXTERNAL_USER_ID}/components/${componentName}/versions/${componentVersion}/actions/${actionName}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        "Content-Type": "application/json",
        "X-Environment": BYTECHEF_ENVIRONMENT,
      },
      body: JSON.stringify({ input }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(data, { status: response.status });
  }

  return NextResponse.json(data);
}
