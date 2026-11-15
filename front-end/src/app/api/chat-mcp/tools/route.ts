import { createMCPClient } from "@ai-sdk/mcp";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { getToken } from "@/lib/api";
import { BYTECHEF_ENVIRONMENT, BYTECHEF_MCP_SERVER_URL } from "@/lib/config";

// The _meta key in which the ByteChef MCP server names the integration a tool belongs to.
const INTEGRATION_ID_META_KEY = "bytechef.io/integrationId";

export type McpToolSummary = {
  description?: string;
  integrationId?: number;
  name: string;
  title?: string;
};

export async function GET() {
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

  try {
    const { tools } = await mcpClient.listTools();

    const toolSummaries: McpToolSummary[] = tools
      .map((tool) => {
        const integrationId = tool._meta?.[INTEGRATION_ID_META_KEY];

        return {
          description: tool.description,
          integrationId: typeof integrationId === "number" ? integrationId : undefined,
          name: tool.name,
          title: tool.title,
        };
      })
      .sort((first, second) => first.name.localeCompare(second.name));

    return Response.json({ tools: toolSummaries });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return Response.json({ error: message }, { status: 502 });
  } finally {
    await mcpClient.close();
  }
}
