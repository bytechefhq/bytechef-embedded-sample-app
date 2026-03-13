import { createMCPClient } from "@ai-sdk/mcp";
import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  streamText,
  convertToModelMessages,
  type UIMessage,
  type JSONSchema7,
} from "ai";

import { getToken } from "@/lib/api";

const BYTECHEF_MCP_SERVER_URL = process.env.NEXT_PUBLIC_BYTECHEF_MCP_SERVER_URL || '';
const BYTECHEF_ENVIRONMENT = process.env.NEXT_PUBLIC_BYTECHEF_ENVIRONMENT || "DEVELOPMENT";

export async function POST(req: Request) {
  const {
    messages,
    system,
    tools: clientTools,
  }: {
    messages: UIMessage[];
    system?: string;
    tools?: Record<string, { description?: string; parameters: JSONSchema7 }>;
  } = await req.json();

  const jwtToken = await getToken();

  const mcpClient = await createMCPClient({
    transport: new StreamableHTTPClientTransport(
      new URL(BYTECHEF_MCP_SERVER_URL),
      {
        requestInit: {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            "X-Environment": BYTECHEF_ENVIRONMENT,
          },
        },
      }
    ),
  });

  const tools = await mcpClient.tools();

  const result = streamText({
    model: openai.chat("gpt-5"),
    messages: await convertToModelMessages(messages),
    tools: {
      ...tools,
      ...frontendTools(clientTools ?? {}),
    },
    toolChoice: "auto",
    ...(system === undefined ? {} : { system }),
    onFinish: async () => {
      await mcpClient.close();
    },
  });

  return result.toUIMessageStreamResponse();
}
