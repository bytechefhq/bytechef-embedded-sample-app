import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import {
  streamText,
  convertToModelMessages,
  tool as defineTool,
  jsonSchema,
  type UIMessage,
  type JSONSchema7,
} from "ai";

import { getToken } from "@/lib/api";

const BYTECHEF_APP_BASE_URL = process.env.NEXT_PUBLIC_BYTECHEF_APP_BASE_URL || "http://localhost:5173";
const BYTECHEF_ENVIRONMENT = process.env.NEXT_PUBLIC_BYTECHEF_ENVIRONMENT || "DEVELOPMENT";
const BYTECHEF_EXTERNAL_USER_ID = process.env.NEXT_PUBLIC_BYTECHEF_EXTERNAL_USER_ID || "1234567890";

interface ByteChefToolI {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: string;
  };
}

async function getTools(): Promise<
  Record<string, ReturnType<typeof defineTool>>
> {
  const jwtToken = await getToken();

  const response = await fetch(
    `${BYTECHEF_APP_BASE_URL}/api/embedded/v1/${BYTECHEF_EXTERNAL_USER_ID}/tools`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        "X-Environment": BYTECHEF_ENVIRONMENT,
      },
    }
  );

  if (!response.ok) {
    console.error("Failed to fetch tools:", response.status);

    return {};
  }

  const toolsByCategory: Record<string, ByteChefToolI[]> = await response.json();
  const allTools = Object.values(toolsByCategory).flat();

  return Object.fromEntries(
    allTools.map((curTool) => {
      const parsedParams = JSON.parse(curTool.function.parameters);

      return [
        curTool.function.name,
        defineTool({
          description: curTool.function.description,
          inputSchema: jsonSchema(parsedParams),
          execute: async (params) => {
            const executeResponse = await fetch(
              `${BYTECHEF_APP_BASE_URL}/api/embedded/v1/${BYTECHEF_EXTERNAL_USER_ID}/tools`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${jwtToken}`,
                  "Content-Type": "application/json",
                  "X-Environment": BYTECHEF_ENVIRONMENT,
                },
                body: JSON.stringify({
                  name: curTool.function.name,
                  parameters: params,
                }),
              }
            );

            const output = await executeResponse.json();

            if (!executeResponse.ok) {
              throw new Error(JSON.stringify(output, null, 2));
            }

            return output;
          },
        }),
      ];
    })
  );
}

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

  const tools = await getTools();

  const result = streamText({
    model: openai.chat("gpt-5"),
    messages: await convertToModelMessages(messages),
    tools: {
      ...tools,
      ...frontendTools(clientTools ?? {}),
    },
    toolChoice: "auto",
    ...(system === undefined ? {} : { system }),
  });

  return result.toUIMessageStreamResponse();
}
