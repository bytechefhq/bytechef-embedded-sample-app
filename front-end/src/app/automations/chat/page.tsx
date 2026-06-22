'use client';

import { ExternalLinkIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken } from "@/lib/api";
import EmbeddedWorkflowChat from "@/components/embedded-workflow-chat";

import { Button } from "@/components/ui/button";

const DEFAULT_BYTECHEF_APP_BASE_URL = "http://localhost:5173";

export default function GenerateFromChatPage() {
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [workflowUuid, setWorkflowUuid] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    getToken()
      .then(setJwtToken)
      .catch((error) => console.error("Failed to fetch token:", error));
  }, []);

  return (
    <div className="flex h-screen w-full flex-col p-4">
      {workflowUuid && (
        <div className="mb-3 flex items-center justify-end">
          <Button onClick={() => router.push(`/automations/${workflowUuid}`)}>
            <ExternalLinkIcon className="h-4 w-4 mr-2" />
            Open workflow
          </Button>
        </div>
      )}

      <div className="min-h-0 flex-1">
        {jwtToken ? (
          <EmbeddedWorkflowChat
            baseUrl={process.env.NEXT_PUBLIC_BYTECHEF_APP_BASE_URL ?? DEFAULT_BYTECHEF_APP_BASE_URL}
            description="Describe the workflow you want and refine it by chatting."
            environment="DEVELOPMENT"
            jwtToken={jwtToken}
            onWorkflowReady={setWorkflowUuid}
            title="New from Chat"
          />
        ) : (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        )}
      </div>
    </div>
  );
}
