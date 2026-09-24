"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckIcon, CopyIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
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

type ActionType = "deprovision" | "disable" | "enable" | "provision" | "run";

export default function AutomationWorkflowPage() {
  const [automations, setAutomations] = useState<AutomationI[]>([]);
  const [automationsError, setAutomationsError] = useState<string | null>(null);
  const [automationsLoading, setAutomationsLoading] = useState(false);
  const [connectionsJson, setConnectionsJson] = useState("");
  const [copied, setCopied] = useState(false);
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

  const copySampleWorkflow = async () => {
    await navigator.clipboard.writeText(sampleWorkflowJson);

    setCopied(true);

    setTimeout(() => setCopied(false), 2000);
  };

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

      <Card>
        <CardHeader>
          <CardTitle>1. Prepare the Workflow in ByteChef</CardTitle>

          <CardDescription>
            Programmatic provisioning references a published catalog workflow instead of copying it, so every connected
            user runs the version you publish.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>
              In ByteChef, open <strong>Embedded &rsaquo; Automation Workflows</strong> and create a project.
            </li>

            <li>
              To provision it only from here, turn off <strong>Show in Automation Hub</strong> in the project dialog.
            </li>

            <li>
              Create a workflow in the project, open its code editor, replace the definition with the workflow below and
              save.
            </li>

            <li>
              Publish the project from its <strong>&#8942;</strong> menu.
            </li>

            <li>
              Copy the workflow UUID from the editor URL (
              <code>/embedded/automation-workflows/&#123;workflowUuid&#125;/editor</code>) into step 2.
            </li>
          </ol>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="sampleWorkflow">Sample workflow</Label>

              <Button onClick={copySampleWorkflow} size="sm" type="button" variant="outline">
                {copied ? <CheckIcon className="mr-2 size-4" /> : <CopyIcon className="mr-2 size-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>

            <Textarea className="font-mono text-sm" id="sampleWorkflow" readOnly rows={16} value={sampleWorkflowJson} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>2. Provision and Run</CardTitle>

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
