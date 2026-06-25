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
// Curated to reflect the integrations connected in this sample (Slack, Gmail, Mailchimp, AWS S3) and
// representative actions the assistant's tools can perform for them.
const SUGGESTIONS: SuggestionConfig[] = [
  {
    label: "to a channel",
    prompt: "Send a Slack message to a channel",
    title: "Send a Slack message",
  },
  {
    label: "with Gmail",
    prompt: "Draft and send an email with Gmail",
    title: "Draft and send an email",
  },
  {
    label: "to a Mailchimp audience",
    prompt: "Add a new subscriber to a Mailchimp audience",
    title: "Add a new subscriber",
  },
  {
    label: "to an AWS S3 bucket",
    prompt: "Upload a file to an AWS S3 bucket",
    title: "Upload a file",
  },
];

export default function ChatComponentKitPage() {
  const runtime = useChatRuntime({
    transport: new DefaultChatTransport({ api: "/api/chat-component-kit" }),
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
