'use client';

import { EmbeddedWorkflowChat } from "@bytechef/embedded-react";
import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken } from "@/lib/api";

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
    <div className="mx-auto flex h-screen max-w-3xl flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => router.push("/automations")}>
          <ArrowLeftIcon className="h-4 w-4" />
        </Button>

        {workflowUuid && (
          <Button onClick={() => router.push(`/automations/${workflowUuid}`)}>
            <ExternalLinkIcon className="h-4 w-4 mr-2" />
            Open workflow
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 rounded-md border border-border">
        {jwtToken ? (
          <EmbeddedWorkflowChat
            baseUrl={process.env.NEXT_PUBLIC_BYTECHEF_APP_BASE_URL ?? DEFAULT_BYTECHEF_APP_BASE_URL}
            description="Describe the workflow you want and refine it by chatting."
            environment="DEVELOPMENT"
            jwtToken={jwtToken}
            onWorkflowReady={setWorkflowUuid}
            title="Generate from Chat"
          />
        ) : (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        )}
      </div>
    </div>
  );
}
