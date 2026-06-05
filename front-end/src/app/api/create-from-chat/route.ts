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

const BYTECHEF_APP_BASE_URL =
  process.env.NEXT_PUBLIC_BYTECHEF_APP_BASE_URL || "http://localhost:5173";
const BYTECHEF_ENVIRONMENT =
  process.env.NEXT_PUBLIC_BYTECHEF_ENVIRONMENT || "DEVELOPMENT";
const BYTECHEF_EXTERNAL_USER_ID =
  process.env.NEXT_PUBLIC_BYTECHEF_EXTERNAL_USER_ID || "1234567890";

const CREATE_TOOL_NAME =
  "EMBEDDEDWORKFLOWBUILDER_CREATE_CONNECTED_USER_WORKFLOW_FROM_PROMPT";
const UPDATE_TOOL_NAME =
  "EMBEDDEDWORKFLOWBUILDER_UPDATE_CONNECTED_USER_WORKFLOW_FROM_PROMPT";

const SYSTEM_PROMPT =
  "You help the user create and refine a ByteChef automation workflow from natural language. " +
  "Use the `createWorkflow` tool to create a workflow from the user's description; it returns the new workflow's uuid. " +
  "Use the `updateWorkflow` tool (passing that uuid) to refine the workflow when the user asks for changes. " +
  "After creating or updating, briefly describe what you built and ask whether they want changes or are satisfied. " +
  "When the user confirms they are done or satisfied, call the `returnToAutomations` tool to take them back to the automations list.";

async function executeWorkflowTool(
  name: string,
  parameters: Record<string, unknown>
): Promise<unknown> {
  const jwtToken = await getToken();

  const response = await fetch(
    `${BYTECHEF_APP_BASE_URL}/api/embedded/v1/${BYTECHEF_EXTERNAL_USER_ID}/tools`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        "Content-Type": "application/json",
        "X-Environment": BYTECHEF_ENVIRONMENT,
      },
      body: JSON.stringify({ name, parameters }),
    }
  );

  const output = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(output, null, 2));
  }

  return output;
}

const workflowTools = {
  createWorkflow: defineTool({
    description:
      "Create a new ByteChef automation workflow from a natural language prompt. Returns the new workflow's uuid.",
    inputSchema: jsonSchema<{ prompt: string }>({
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Natural language description of the workflow to build.",
        },
      },
      required: ["prompt"],
      additionalProperties: false,
    }),
    execute: async ({ prompt }) =>
      executeWorkflowTool(CREATE_TOOL_NAME, { prompt }),
  }),
  updateWorkflow: defineTool({
    description:
      "Update an existing ByteChef workflow from a natural language prompt. Pass the workflowUuid returned by createWorkflow. Returns the workflow uuid.",
    inputSchema: jsonSchema<{ workflowUuid: string; prompt: string }>({
      type: "object",
      properties: {
        workflowUuid: {
          type: "string",
          description: "The uuid of the workflow to update.",
        },
        prompt: {
          type: "string",
          description: "Natural language description of the changes to apply.",
        },
      },
      required: ["workflowUuid", "prompt"],
      additionalProperties: false,
    }),
    execute: async ({ workflowUuid, prompt }) =>
      executeWorkflowTool(UPDATE_TOOL_NAME, { workflowUuid, prompt }),
  }),
};

export async function POST(req: Request) {
  const {
    messages,
    tools: clientTools,
  }: {
    messages: UIMessage[];
    system?: string;
    tools?: Record<string, { description?: string; parameters: JSONSchema7 }>;
  } = await req.json();

  const result = streamText({
    model: openai.chat("gpt-5"),
    messages: await convertToModelMessages(messages),
    system: SYSTEM_PROMPT,
    tools: {
      ...workflowTools,
      ...frontendTools(clientTools ?? {}),
    },
    toolChoice: "auto",
  });

  return result.toUIMessageStreamResponse();
}
