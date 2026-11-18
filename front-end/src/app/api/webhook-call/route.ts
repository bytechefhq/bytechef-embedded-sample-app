import { NextResponse } from "next/server";

interface WebhookCallRequestI {
  body?: string;
  method?: "GET" | "POST";
  url?: string;
}

export async function POST(req: Request) {
  const { body, method = "POST", url } = (await req.json()) as WebhookCallRequestI;

  let webhookUrl: URL;

  try {
    webhookUrl = new URL(url ?? "");
  } catch {
    return NextResponse.json({ error: "A valid webhook URL is required." }, { status: 400 });
  }

  if (!["http:", "https:"].includes(webhookUrl.protocol) || !webhookUrl.pathname.startsWith("/webhooks/")) {
    return NextResponse.json({ error: "Only ByteChef webhook URLs (/webhooks/...) can be called." }, { status: 400 });
  }

  const response = await fetch(webhookUrl, {
    body: method === "POST" && body ? body : undefined,
    headers: method === "POST" && body ? { "Content-Type": "application/json" } : undefined,
    method,
    redirect: "manual",
  });

  return NextResponse.json({
    body: await response.text(),
    contentType: response.headers.get("content-type"),
    location: response.headers.get("location"),
    status: response.status,
  });
}
