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
  label: "Greeting Reference",
  description: "Provisioned from the Automation Workflow Playground. Replies to a request with a greeting.",
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
      label: "Build greeting",
      name: "var_1",
      type: "var/v1/set",
      parameters: {
        type: "STRING",
        value: "Hello, ${trigger_1.body.name}!",
      },
    },
  ],
  outputs: [
    {
      name: "greeting",
      value: "${var_1}",
    },
  ],
};

const sampleWorkflowJson = JSON.stringify(sampleWorkflow, null, 2);

const exampleRunBody = {
  name: "Ada",
};

interface AutomationI {
  catalogWorkflowUuid?: string;
  dangling?: boolean;
  enabled?: boolean;
  kind?: "COPY" | "REFERENCE";
  label?: string;
  workflowUuid?: string;
}

interface CatalogProjectI {
  description?: string;
  id?: number;
  kind?: "COPY" | "REFERENCE";
  name?: string;
  workflowTemplates?: CatalogWorkflowTemplateI[];
}

interface CatalogWorkflowTemplateI {
  description?: string;
  id?: string;
  label?: string;
}

type ActionType = "deprovision" | "disable" | "enable" | "provision" | "run";

export default function AutomationWorkflowPage() {
  const [automations, setAutomations] = useState<AutomationI[]>([]);
  const [automationsError, setAutomationsError] = useState<string | null>(null);
  const [automationsLoading, setAutomationsLoading] = useState(false);
  const [connectionsJson, setConnectionsJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<ActionType | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [runBodyJson, setRunBodyJson] = useState(JSON.stringify(exampleRunBody, null, 2));
  const [workflowUuid, setWorkflowUuid] = useState("");

  const loadAutomations = useCallback(async () => {
    setAutomationsLoading(true);
    setAutomationsError(null);

    try {
      const response = await fetch("/api/automation-workflow/workflows");

      const text = await response.text();

      if (!response.ok) {
        setAutomationsError(formatBody(text) || `HTTP ${response.status}`);

        return;
      }

      const rows = (text ? JSON.parse(text) : []) as AutomationI[];

      setAutomations(rows.filter((automation) => automation.kind === "REFERENCE"));
    } catch (loadError) {
      setAutomationsError(loadError instanceof Error ? loadError.message : "Could not load automations");
    } finally {
      setAutomationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAutomations();
  }, [loadAutomations]);

  const perform = async (action: ActionType) => {
    setResult(null);
    setError(null);

    const uuid = workflowUuid.trim();

    if (!uuid) {
      setError("Catalog workflow UUID is required.");

      return;
    }

    setPendingAction(action);

    try {
      const encodedUuid = encodeURIComponent(uuid);

      let response: Response;

      if (action === "provision") {
        const connections = connectionsJson.trim() ? JSON.parse(connectionsJson) : undefined;

        response = await fetch(`/api/automation-workflow/${encodedUuid}/provision`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: connections ? JSON.stringify({ connections }) : undefined,
        });
      } else if (action === "deprovision") {
        response = await fetch(`/api/automation-workflow/${encodedUuid}/provision`, { method: "DELETE" });
      } else if (action === "enable" || action === "disable") {
        response = await fetch(`/api/automation-workflow/${encodedUuid}/enable`, {
          method: action === "enable" ? "POST" : "DELETE",
        });
      } else {
        const body = runBodyJson.trim() ? JSON.stringify(JSON.parse(runBodyJson)) : undefined;

        response = await fetch(`/api/request/${encodedUuid}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
      }

      const formatted = formatBody(await response.text());

      if (!response.ok) {
        setError(formatted || `HTTP ${response.status}`);
      } else {
        setResult(formatted || `${actionLabel(action)} succeeded (HTTP ${response.status})`);
      }

      if (action !== "run") {
        await loadAutomations();
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Request failed");
    } finally {
      setPendingAction(null);
    }
  };

  const busy = pendingAction !== null;

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-xl font-semibold">Automation Workflow Playground</h1>

      <PrepareWorkflowCard
        description={
          <>
            Programmatic provisioning references a published catalog workflow instead of copying it, so every connected
            user runs the version you publish.
          </>
        }
        sampleWorkflowJson={sampleWorkflowJson}
        steps={
          <>
            <li>
              In ByteChef, open <strong>Embedded &rsaquo; Automation Workflows</strong> and create a project.
            </li>

            <li>
              Keep <strong>Show in Automation Hub</strong> on in the project dialog so step 2 can list it. A project
              with it turned off can be provisioned only from here, but step 2 won&rsquo;t list it: copy the UUID from
              the editor URL (<code>/embedded/automation-workflows/&#123;workflowUuid&#125;/editor</code>) instead.
            </li>

            <li>
              Create a workflow in the project, open its code editor, replace the definition with the workflow below and
              save.
            </li>

            <li>
              Publish the project from its <strong>&#8942;</strong> menu.
            </li>

            <li>Find the workflow&rsquo;s UUID in step 2.</li>
          </>
        }
        title="1. Prepare the Workflow in ByteChef"
      />

      <FindCatalogWorkflowUuidCard onSelect={setWorkflowUuid} selectedWorkflowUuid={workflowUuid.trim()} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>3. Provision and Run</CardTitle>

            <CardDescription>
              Provisioning calls <code>POST /api/embedded/v1/automation/workflow-templates/{`{workflowUuid}`}/provision</code>{" "}
              as the connected user, wiring connections by component. Enable it before running it; running calls the
              workflow&rsquo;s request trigger by the same UUID.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="workflowUuid">Catalog workflow UUID</Label>

              <Input
                id="workflowUuid"
                onChange={(event) => setWorkflowUuid(event.target.value)}
                placeholder="e.g. 4f3a9c2e-1b8d-4a7e-9c12-3f5b6a8d2e10"
                value={workflowUuid}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="connectionsJson">Connections (JSON, optional)</Label>

              <Textarea
                className="font-mono text-sm"
                id="connectionsJson"
                onChange={(event) => setConnectionsJson(event.target.value)}
                placeholder='{"slack": 12}'
                rows={3}
                value={connectionsJson}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <ActionButton action="provision" onClick={perform} pendingAction={pendingAction} disabled={busy} />

              <ActionButton action="enable" onClick={perform} pendingAction={pendingAction} disabled={busy} />

              <ActionButton action="disable" onClick={perform} pendingAction={pendingAction} disabled={busy} />

              <ActionButton
                action="deprovision"
                disabled={busy}
                onClick={perform}
                pendingAction={pendingAction}
                variant="destructive"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="runBodyJson">Run body (JSON, optional)</Label>

              <Textarea
                className="font-mono text-sm"
                id="runBodyJson"
                onChange={(event) => setRunBodyJson(event.target.value)}
                rows={4}
                value={runBodyJson}
              />
            </div>

            <ActionButton action="run" disabled={busy} onClick={perform} pendingAction={pendingAction} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>

            <CardDescription>The response of the last action appears here.</CardDescription>
          </CardHeader>

          <CardContent>
            {busy && <p className="text-sm text-muted-foreground">Working...</p>}

            {error && <pre className="overflow-auto rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</pre>}

            {result && <pre className="overflow-auto rounded-md bg-muted p-4 text-sm">{result}</pre>}

            {!busy && !error && !result && (
              <p className="text-sm text-muted-foreground">Provision, enable, then run the workflow.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Provisioned References</CardTitle>

            <CardDescription>
              The connected user&rsquo;s reference automations, from <code>GET /api/embedded/v1/automation/workflows</code>.
            </CardDescription>
          </div>

          <Button disabled={automationsLoading} onClick={loadAutomations} size="sm" variant="outline">
            <RefreshCwIcon className="mr-2 size-4" />
            Refresh
          </Button>
        </CardHeader>

        <CardContent>
          {automationsError && (
            <pre className="overflow-auto rounded-md bg-red-50 p-4 text-sm text-red-700">{automationsError}</pre>
          )}

          {!automationsError && automations.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {automationsLoading ? "Loading..." : "No references provisioned yet."}
            </p>
          )}

          {automations.length > 0 && (
            <ul className="divide-y">
              {automations.map((automation) => (
                <li className="flex items-center justify-between gap-4 py-2" key={automation.catalogWorkflowUuid}>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{automation.label || "Untitled"}</span>

                    <button
                      className="text-left font-mono text-xs text-muted-foreground hover:underline"
                      onClick={() => setWorkflowUuid(automation.catalogWorkflowUuid ?? "")}
                      type="button"
                    >
                      {automation.catalogWorkflowUuid}
                    </button>
                  </div>

                  <span className="text-xs text-muted-foreground">
                    {automation.dangling ? "Needs attention" : automation.enabled ? "Enabled" : "Disabled"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface FindCatalogWorkflowUuidCardProps {
  onSelect: (workflowUuid: string) => void;
  selectedWorkflowUuid: string;
}

function FindCatalogWorkflowUuidCard({ onSelect, selectedWorkflowUuid }: FindCatalogWorkflowUuidCardProps) {
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState<CatalogProjectI[]>([]);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError(null);

    try {
      const response = await fetch("/api/automation-workflow/projects");

      const text = await response.text();

      if (!response.ok) {
        setProjectsError(formatBody(text) || `HTTP ${response.status}`);

        return;
      }

      setProjects((text ? JSON.parse(text) : []) as CatalogProjectI[]);
    } catch (loadError) {
      setProjectsError(loadError instanceof Error ? loadError.message : "Could not load catalog projects");
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const project = projects.find((item) => String(item.id) === projectId);

  const workflows = (project?.workflowTemplates ?? [])
    .filter((template) => template.id)
    .map((template) => ({ label: template.label, workflowUuid: template.id! }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <CardTitle>2. Find the Workflow UUID</CardTitle>

          <CardDescription>
            Lists the published catalog projects shown in the Automation Hub with{" "}
            <code>GET /api/embedded/v1/automation/projects</code>. Each project carries its{" "}
            <code>workflowTemplates</code>, and a template&rsquo;s <code>id</code> is the workflow UUID.
          </CardDescription>
        </div>

        <Button disabled={projectsLoading} onClick={loadProjects} size="sm" type="button" variant="outline">
          <RefreshCwIcon className="mr-2 size-4" />
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {projectsError && (
          <pre className="overflow-auto rounded-md bg-red-50 p-4 text-sm text-red-700">{projectsError}</pre>
        )}

        {!projectsError && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="catalogProjectId">Catalog project</Label>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
              disabled={projectsLoading || projects.length === 0}
              id="catalogProjectId"
              onChange={(event) => setProjectId(event.target.value)}
              value={projectId}
            >
              <option value="">
                {projectsLoading
                  ? "Loading..."
                  : projects.length === 0
                    ? "No published projects in the Automation Hub"
                    : "Select a project"}
              </option>

              {projects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name || `Project ${item.id}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {project && workflows.length === 0 && (
          <p className="text-sm text-muted-foreground">This project has no published workflows.</p>
        )}

        {workflows.length > 0 && (
          <WorkflowUuidList onSelect={onSelect} selectedWorkflowUuid={selectedWorkflowUuid} workflows={workflows} />
        )}
      </CardContent>
    </Card>
  );
}

interface ActionButtonProps {
  action: ActionType;
  disabled: boolean;
  onClick: (action: ActionType) => void;
  pendingAction: ActionType | null;
  variant?: "default" | "destructive";
}

function ActionButton({ action, disabled, onClick, pendingAction, variant = "default" }: ActionButtonProps) {
  return (
    <Button disabled={disabled} onClick={() => onClick(action)} type="button" variant={variant}>
      {pendingAction === action && <Loader2Icon className="mr-2 size-4 animate-spin" />}
      {actionLabel(action)}
    </Button>
  );
}

function actionLabel(action: ActionType): string {
  switch (action) {
    case "deprovision":
      return "Deprovision";
    case "disable":
      return "Disable";
    case "enable":
      return "Enable";
    case "provision":
      return "Provision";
    default:
      return "Run Workflow";
  }
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
