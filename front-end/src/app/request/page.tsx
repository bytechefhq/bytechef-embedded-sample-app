"use client";

import { PrepareWorkflowCard } from "@/components/playground/prepare-workflow-card";
import { WorkflowUuidList } from "@/components/playground/workflow-uuid-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2Icon, RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const sampleWorkflow = {
  label: "Echo Request",
  description: "Created from the Request Playground. Replies with the message it receives.",
  inputs: [],
  triggers: [
    {
      label: "Await Workflow and Respond",
      name: "trigger_1",
      type: "request/v1/awaitWorkflowAndRespond",
      parameters: {},
    },
  ],
  tasks: [
    {
      label: "Build reply",
      name: "var_1",
      type: "var/v1/set",
      parameters: {
        type: "STRING",
        value: "You said: ${trigger_1.body.message}",
      },
    },
  ],
  outputs: [
    {
      name: "reply",
      value: "${var_1}",
    },
  ],
};

const sampleWorkflowJson = JSON.stringify(sampleWorkflow, null, 2);

const exampleBody = {
  message: "Hello from the Request Playground"
};

interface IntegrationI {
  id?: number;
  integrationInstances?: IntegrationInstanceI[];
  name?: string;
  workflows?: IntegrationWorkflowI[];
}

interface IntegrationInstanceI {
  id?: number;
  workflows?: { enabled?: boolean; workflowUuid?: string }[];
}

interface IntegrationWorkflowI {
  description?: string;
  label?: string;
  workflowUuid?: string;
}

export default function RequestPage() {
  const [workflowUuid, setWorkflowUuid] = useState("");
  const [bodyJson, setBodyJson] = useState(JSON.stringify(exampleBody, null, 2));
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setResult(null);
    setError(null);

    if (!workflowUuid.trim()) {
      setError("Workflow UUID is required.");

      return;
    }

    setLoading(true);

    try {
      let body: string | undefined;

      if (bodyJson.trim()) {
        body = JSON.stringify(JSON.parse(bodyJson));
      }

      const response = await fetch(
        `/api/request/${encodeURIComponent(workflowUuid.trim())}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        }
      );

      const text = await response.text();
      const formatted = formatBody(text);

      if (!response.ok) {
        setError(formatted || `HTTP ${response.status}`);
      } else {
        setResult(formatted || `HTTP ${response.status} (empty body)`);
      }
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Invalid JSON body");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-xl font-semibold">Request Playground</h1>

      <PrepareWorkflowCard
        description={
          <>
            A workflow is callable once it starts with the <strong>Request</strong> trigger and the connected user has
            its integration.
          </>
        }
        sampleWorkflowJson={sampleWorkflowJson}
        steps={
          <>
            <li>
              In ByteChef, open <strong>Embedded &rsaquo; Integrations</strong> and create an integration for a component
              with a connection.
            </li>

            <li>
              Create a workflow in the integration, open the <strong>Workflow Code Editor</strong> from the right
              sidebar, replace the definition with the workflow below and save.
            </li>

            <li>
              <strong>Publish</strong> the integration from the editor header.
            </li>

            <li>
              In <strong>Embedded &rsaquo; Integration Instances</strong>, create an instance configuration for the
              published version, then enable it and the workflow. A call to a disabled workflow returns an empty 200.
            </li>

            <li>
              In this app&rsquo;s <strong>Integrations</strong> page, connect the integration as the demo user.
            </li>

            <li>
              In step 2, enable the workflow for the demo user if it isn&rsquo;t already, then use its UUID. Running a
              workflow the user hasn&rsquo;t enabled fails with <code>IntegrationInstanceWorkflow not found</code>.
            </li>
          </>
        }
        title="1. Prepare the Workflow in ByteChef"
      />

      <FindWorkflowUuidCard onSelect={setWorkflowUuid} selectedWorkflowUuid={workflowUuid.trim()} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>3. Execute Workflow</CardTitle>

            <CardDescription>
              Calls <code>POST /api/embedded/v1/workflows/{`{workflowUuid}`}</code>. The
              optional body and headers are forwarded to the workflow&rsquo;s request trigger.
              Workflows using <code>awaitWorkflowAndRespond</code> block until the workflow
              completes and return its response; workflows using{" "}
              <code>autoRespondWithHTTP200</code> return an empty 200 immediately while the
              workflow runs in the background.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2">
                <Label htmlFor="workflowUuid">Workflow UUID</Label>

                <Input
                  id="workflowUuid"
                  onChange={(event) => setWorkflowUuid(event.target.value)}
                  placeholder="e.g. 4f3a9c2e-1b8d-4a7e-9c12-3f5b6a8d2e10"
                  value={workflowUuid}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="bodyJson">Body (JSON, optional)</Label>

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
                Execute Workflow
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>

            <CardDescription>
              The response from the request trigger will appear here.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loading && (
              <p className="text-sm text-muted-foreground">Executing...</p>
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
                Submit the form to execute the workflow.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface FindWorkflowUuidCardProps {
  onSelect: (workflowUuid: string) => void;
  selectedWorkflowUuid: string;
}

function FindWorkflowUuidCard({ onSelect, selectedWorkflowUuid }: FindWorkflowUuidCardProps) {
  const [enableError, setEnableError] = useState<string | null>(null);
  const [enablingWorkflowUuid, setEnablingWorkflowUuid] = useState<string | null>(null);
  const [integration, setIntegration] = useState<IntegrationI | null>(null);
  const [integrationError, setIntegrationError] = useState<string | null>(null);
  const [integrationId, setIntegrationId] = useState("");
  const [integrationLoading, setIntegrationLoading] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationI[]>([]);
  const [integrationsError, setIntegrationsError] = useState<string | null>(null);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);

  const loadIntegrations = useCallback(async () => {
    setIntegrationsLoading(true);
    setIntegrationsError(null);

    try {
      const response = await fetch("/api/integrations");

      const text = await response.text();

      if (!response.ok) {
        setIntegrationsError(formatBody(text) || `HTTP ${response.status}`);

        return;
      }

      setIntegrations((text ? JSON.parse(text) : []) as IntegrationI[]);
    } catch (loadError) {
      setIntegrationsError(loadError instanceof Error ? loadError.message : "Could not load integrations");
    } finally {
      setIntegrationsLoading(false);
    }
  }, []);

  const loadIntegration = async (id: string) => {
    setIntegrationId(id);
    setIntegration(null);
    setIntegrationError(null);
    setEnableError(null);

    if (!id) {
      return;
    }

    setIntegrationLoading(true);

    try {
      const response = await fetch(`/api/integrations/${encodeURIComponent(id)}`);

      const text = await response.text();

      if (!response.ok) {
        setIntegrationError(formatBody(text) || `HTTP ${response.status}`);

        return;
      }

      setIntegration(JSON.parse(text) as IntegrationI);
    } catch (loadError) {
      setIntegrationError(loadError instanceof Error ? loadError.message : "Could not load the integration");
    } finally {
      setIntegrationLoading(false);
    }
  };

  const integrationInstance = integration?.integrationInstances?.[0];

  const enableWorkflow = async (workflowUuid: string) => {
    if (!integrationInstance?.id) {
      return;
    }

    setEnableError(null);
    setEnablingWorkflowUuid(workflowUuid);

    try {
      const response = await fetch(
        `/api/integration-instances/${integrationInstance.id}/workflows/${encodeURIComponent(workflowUuid)}/enable`,
        { method: "POST" }
      );

      if (!response.ok) {
        setEnableError(formatBody(await response.text()) || `HTTP ${response.status}`);

        return;
      }

      await loadIntegration(integrationId);
    } catch (enableWorkflowError) {
      setEnableError(enableWorkflowError instanceof Error ? enableWorkflowError.message : "Could not enable the workflow");
    } finally {
      setEnablingWorkflowUuid(null);
    }
  };

  const isWorkflowEnabled = (workflowUuid: string) =>
    integrationInstance?.workflows?.some((workflow) => workflow.workflowUuid === workflowUuid && workflow.enabled) ??
    false;

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  const workflows = (integration?.workflows ?? [])
    .filter((workflow) => workflow.workflowUuid)
    .map((workflow) => ({ label: workflow.label, workflowUuid: workflow.workflowUuid! }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <CardTitle>2. Find the Workflow UUID</CardTitle>

          <CardDescription>
            Lists the connected user&rsquo;s active integrations with <code>GET /api/embedded/v1/integrations</code>,
            then reads the chosen one&rsquo;s workflows with <code>GET /api/embedded/v1/integrations/{`{id}`}</code>.
            The UUID stays the same across published versions.
          </CardDescription>
        </div>

        <Button disabled={integrationsLoading} onClick={loadIntegrations} size="sm" type="button" variant="outline">
          <RefreshCwIcon className="mr-2 size-4" />
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {integrationsError && (
          <pre className="overflow-auto rounded-md bg-red-50 p-4 text-sm text-red-700">{integrationsError}</pre>
        )}

        {!integrationsError && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="integrationId">Integration</Label>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
              disabled={integrationsLoading || integrations.length === 0}
              id="integrationId"
              onChange={(event) => loadIntegration(event.target.value)}
              value={integrationId}
            >
              <option value="">
                {integrationsLoading
                  ? "Loading..."
                  : integrations.length === 0
                    ? "No active integrations"
                    : "Select an integration"}
              </option>

              {integrations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name || `Integration ${item.id}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {integrationLoading && <p className="text-sm text-muted-foreground">Loading workflows...</p>}

        {integrationError && (
          <pre className="overflow-auto rounded-md bg-red-50 p-4 text-sm text-red-700">{integrationError}</pre>
        )}

        {integration && !integrationInstance && (
          <p className="text-sm text-muted-foreground">
            The demo user hasn&rsquo;t connected this integration yet. Connect it on the <strong>Integrations</strong>{" "}
            page first.
          </p>
        )}

        {enableError && <pre className="overflow-auto rounded-md bg-red-50 p-4 text-sm text-red-700">{enableError}</pre>}

        {integration && workflows.length === 0 && (
          <p className="text-sm text-muted-foreground">This integration has no workflows.</p>
        )}

        {workflows.length > 0 && (
          <WorkflowUuidList
            onSelect={onSelect}
            renderActions={(workflow) =>
              integrationInstance &&
              (isWorkflowEnabled(workflow.workflowUuid) ? (
                <span className="text-xs text-muted-foreground">Enabled</span>
              ) : (
                <Button
                  disabled={enablingWorkflowUuid !== null}
                  onClick={() => enableWorkflow(workflow.workflowUuid)}
                  size="sm"
                  type="button"
                >
                  {enablingWorkflowUuid === workflow.workflowUuid && <Loader2Icon className="mr-2 size-4 animate-spin" />}
                  Enable
                </Button>
              ))
            }
            selectedWorkflowUuid={selectedWorkflowUuid}
            workflows={workflows}
          />
        )}
      </CardContent>
    </Card>
  );
}

function formatBody(text: string): string {
  if (!text) {
    return "";
  }

  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}
