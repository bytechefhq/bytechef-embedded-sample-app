"use client";

import { PrepareWorkflowCard } from "@/components/playground/prepare-workflow-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";

const exampleBody = {
  userId: "12345",
  name: "John Doe"
};

const exampleBodyJson = JSON.stringify(exampleBody, null, 2);

const sampleWorkflow = {
  label: "Log App Event",
  description: "Created from the App Event Playground. Logs every app event it receives.",
  inputs: [],
  triggers: [
    {
      label: "New Event",
      name: "trigger_1",
      type: "appEvent/v1/newEvent",
      parameters: {},
    },
  ],
  tasks: [
    {
      label: "Log event",
      name: "logger_1",
      type: "logger/v1/info",
      parameters: {
        text: "App event for ${trigger_1.name} (user ${trigger_1.userId})",
      },
    },
  ],
};

const sampleWorkflowJson = JSON.stringify(sampleWorkflow, null, 2);

export default function AppEventPage() {
  const [bodyJson, setBodyJson] = useState(exampleBodyJson);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setResult(null);
    setError(null);

    let body: string | undefined;

    if (bodyJson.trim()) {
      try {
        body = JSON.stringify(JSON.parse(bodyJson));
      } catch (parseError) {
        setError(parseError instanceof Error ? parseError.message : "Invalid JSON body");

        return;
      }
    }

    setLoading(true);

    try {
      const response = await fetch("/api/app-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ message: response.statusText }));

        setError(JSON.stringify(data, null, 2));
      } else {
        setResult(
          `HTTP ${response.status} — app-event triggers dispatched for all enabled integrations of the current user.`
        );
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-xl font-semibold">App Event Playground</h1>

      <PrepareWorkflowCard
        description={
          <>
            An app event starts every workflow the connected user has enabled whose trigger is{" "}
            <strong>App Event &rsaquo; New Event</strong>.
          </>
        }
        sampleWorkflowJson={sampleWorkflowJson}
        steps={
          <>
            <li>
              In ByteChef, open <strong>Embedded &rsaquo; App Events</strong>, click <strong>New App Event</strong>,
              name it (e.g. <code>user.signed_up</code>) and use the payload from step 2 as its schema.
            </li>

            <li>
              Open <strong>Embedded &rsaquo; Integrations</strong>, create a workflow in an integration, open the{" "}
              <strong>Workflow Code Editor</strong> from the right sidebar, replace the definition with the workflow
              below and save.
            </li>

            <li>
              Select the trigger and choose your event in <strong>App Event Id</strong> on its{" "}
              <strong>Properties</strong> tab.
            </li>

            <li>
              <strong>Publish</strong> the integration, then in <strong>Embedded &rsaquo; Integration Instances</strong>{" "}
              create an instance configuration for the published version and enable it and the workflow.
            </li>

            <li>
              In this app&rsquo;s <strong>Integrations</strong> page, connect the integration and enable the workflow
              for the demo user. Dispatch skips workflows the user hasn&rsquo;t enabled.
            </li>

            <li>
              Dispatch the event in step 2, then open <strong>Embedded &rsaquo; Workflow Executions</strong> to see the
              run and its log.
            </li>
          </>
        }
        title="1. Prepare the Workflow in ByteChef"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>2. Dispatch App Events</CardTitle>

            <CardDescription>
              Calls <code>POST /api/embedded/v1/app-events</code>. The server iterates every
              enabled integration instance for the current connected user and fires each
              workflow&rsquo;s app-event trigger, forwarding the request body as the event
              payload. The body shape is free-form &mdash; it should match the JSON schema
              of the App Event the workflow subscribes to.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2">
                <Label htmlFor="bodyJson">App Event Payload (JSON, optional)</Label>

                <Textarea
                  className="font-mono text-sm"
                  id="bodyJson"
                  onChange={(event) => setBodyJson(event.target.value)}
                  rows={10}
                  value={bodyJson}
                />
              </div>

              <Button disabled={loading} type="submit">
                {loading && <Loader2Icon className="mr-2 size-4 animate-spin" />}
                Dispatch App Events
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>

            <CardDescription>
              The response from the app-event endpoint will appear here.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loading && (
              <p className="text-sm text-muted-foreground">Dispatching...</p>
            )}

            {error && (
              <pre className="overflow-auto rounded-md bg-red-50 p-4 text-sm text-red-700">
                {error}
              </pre>
            )}

            {result && (
              <pre className="overflow-auto rounded-md bg-muted p-4 text-sm">
                {result}
              </pre>
            )}

            {!loading && !error && !result && (
              <p className="text-sm text-muted-foreground">
                Click the button to dispatch app events.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
