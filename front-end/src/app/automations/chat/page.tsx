'use client';

import { ExternalLinkIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken } from "@/lib/api";
import EmbeddedWorkflowChat from "@/components/embedded-workflow-chat";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const DEFAULT_BYTECHEF_APP_BASE_URL = "http://localhost:5173";

export default function GenerateFromChatPage() {
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [workflowUuid, setWorkflowUuid] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    getToken()
      .then(setJwtToken)
      .catch((error) => console.error("Failed to fetch token:", error));
  }, []);

  return (
    <div className="flex h-screen w-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <details className="flex-1 text-sm">
          <summary className="cursor-pointer text-muted-foreground">System prompt (optional)</summary>

          <Textarea
            className="mt-2 w-full max-w-3xl"
            onChange={(event) => setSystemPrompt(event.target.value)}
            placeholder="e.g. Always prefer Slack over email; keep workflows under five steps."
            rows={3}
            value={systemPrompt}
          />
        </details>

        {workflowUuid && (
          <Button onClick={() => router.push(`/automations/${workflowUuid}`)}>
            <ExternalLinkIcon className="h-4 w-4 mr-2" />
            Open workflow
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1">
        {jwtToken ? (
          <EmbeddedWorkflowChat
            baseUrl={process.env.NEXT_PUBLIC_BYTECHEF_APP_BASE_URL ?? DEFAULT_BYTECHEF_APP_BASE_URL}
            environment="DEVELOPMENT"
            jwtToken={jwtToken}
            onWorkflowReady={setWorkflowUuid}
            suggestions={[
              {
                action: "Describe what this workflow does end-to-end",
                label: "does end-to-end.",
                title: "Describe what this workflow",
              },
              {
                action: "Which properties of this node are required?",
                label: "of this node are required?",
                title: "Which properties",
              },
              {
                action: "Search for an action that can send an email",
                label: "that can send an email",
                title: "Search for an action",
              },
              {
                action: "How do I implement conditional branching in workflows?",
                label: "conditional branching in workflows?",
                title: "How do I implement",
              },
            ]}
            systemPrompt={systemPrompt}
          />
        ) : (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        )}
      </div>
    </div>
  );
}
