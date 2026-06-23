"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import {
  AssistantRuntimeProvider,
  type SuggestionConfig,
  Suggestions,
  useAui,
} from "@assistant-ui/react";
import { DefaultChatTransport } from "ai";

// Welcome-screen suggestions registered via the new assistant-ui suggestions API (no longer hardcoded
// inside the Thread component). ThreadPrimitive.Suggestions renders these from the runtime scope.
const SUGGESTIONS: SuggestionConfig[] = [
  {
    label: "does end-to-end.",
    prompt: "Describe what this workflow does end-to-end",
    title: "Describe what this workflow",
  },
  {
    label: "of this node are required?",
    prompt: "Which properties of this node are required?",
    title: "Which properties",
  },
  {
    label: "that can send an email",
    prompt: "Search for an action that can send an email",
    title: "Search for an action",
  },
  {
    label: "conditional branching in workflows?",
    prompt: "How do I implement conditional branching in workflows?",
    title: "How do I implement",
  },
];

export default function ChatMcpPage() {
  const runtime = useChatRuntime({
    transport: new DefaultChatTransport({ api: "/api/chat-mcp" }),
  });

  const aui = useAui({ suggestions: Suggestions(SUGGESTIONS) }, { parent: null });

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      <div className="flex h-[calc(100vh-2rem)] w-full flex-col">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
