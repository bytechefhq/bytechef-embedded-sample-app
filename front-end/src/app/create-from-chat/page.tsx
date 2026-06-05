"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { AssistantRuntimeProvider, useAssistantTool } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";

function ReturnToAutomationsTool() {
  const router = useRouter();

  useAssistantTool({
    toolName: "returnToAutomations",
    description:
      "Return the user to the automations list. Call this only after the user confirms they are satisfied with the created or updated workflow.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    type: "frontend",
    execute: async () => {
      router.push("/automations");

      return { ok: true };
    },
  });

  return null;
}

export default function CreateFromChatPage() {
  const router = useRouter();

  const runtime = useChatRuntime({
    transport: new DefaultChatTransport({ api: "/api/create-from-chat" }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ReturnToAutomationsTool />

      <div className="flex h-[calc(100vh-2rem)] w-full flex-col">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h1 className="text-sm font-medium">Create From Chat</h1>

          <button
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            onClick={() => router.push("/automations")}
            type="button"
          >
            Back to Automations
          </button>
        </div>

        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
