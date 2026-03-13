"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { DefaultChatTransport } from "ai";

export default function ChatMcpPage() {
  const runtime = useChatRuntime({
    transport: new DefaultChatTransport({ api: "/api/chat-mcp" }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-[calc(100vh-2rem)] w-full flex-col">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
