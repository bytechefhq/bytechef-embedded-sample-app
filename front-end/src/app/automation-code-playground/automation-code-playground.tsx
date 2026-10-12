"use client";

import { CodeEditorCard } from "@/components/code-playground/code-editor-card";
import { errorMessage, formatBody, readSourceProperty } from "@/components/code-playground/response-text";
import { automationStarterFileName, automationStarterSource } from "@/components/code-playground/starters";
import { WorkflowUuidList } from "@/components/playground/workflow-uuid-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BYTECHEF_APP_BASE_URL } from "@/lib/config";
import { Loader2Icon, RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const exampleRunBody = {
  name: "Ada",
};

interface CatalogProjectI {
  id?: number;
  kind?: "COPY" | "REFERENCE";
  name?: string;
  workflowTemplates?: CatalogWorkflowTemplateI[];
}

interface CatalogWorkflowTemplateI {
  id?: string;
  label?: string;
}

interface DeployResultI {
  warnings?: string[];
}

interface ReferenceI {
  catalogWorkflowUuid?: string;
  dangling?: boolean;
  enabled?: boolean;
  kind?: "COPY" | "REFERENCE";
}

type ActionType = "deprovision" | "run" | "setUp";

export function AutomationCodePlayground() {
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deployWarnings, setDeployWarnings] = useState<string[] | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState(automationStarterFileName);
  const [pendingAction, setPendingAction] = useState<ActionType | null>(null);
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState<CatalogProjectI[]>([]);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [references, setReferences] = useState<ReferenceI[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [runBodyJson, setRunBodyJson] = useState(JSON.stringify(exampleRunBody, null, 2));
  const [source, setSource] = useState(automationStarterSource);
  const [workflowUuid, setWorkflowUuid] = useState("");

  const loadReferences = useCallback(async (): Promise<ReferenceI[]> => {
    const response = await fetch("/api/automation-workflow/workflows");

    const text = await response.text();

    if (!response.ok) {
      throw new Error(errorMessage(text, response.status));
    }

    const rows = ((text ? JSON.parse(text) : []) as ReferenceI[]).filter(
      (reference) => reference.kind === "REFERENCE"
    );

    setReferences(rows);

    return rows;
  }, []);

  // Lists the published catalog projects the connected user can see and selects the one named `projectName`, which is
  // how the page finds the project it just deployed: the deploy response carries only warnings.
  const loadProjects = useCallback(
    async (projectName?: string) => {
      setProjectsLoading(true);
      setProjectsError(null);

      try {
        const response = await fetch("/api/automation-workflow/projects");

        const text = await response.text();

        if (!response.ok) {
          setProjectsError(errorMessage(text, response.status));

          return;
        }

        const rows = (text ? JSON.parse(text) : []) as CatalogProjectI[];

        setProjects(rows);

        const deployedProject = projectName ? rows.find((project) => project.name === projectName) : undefined;

        if (deployedProject) {
          setProjectId(String(deployedProject.id));

          const templateIds = (deployedProject.workflowTemplates ?? [])
            .map((template) => template.id)
            .filter((templateId): templateId is string => Boolean(templateId));

          setWorkflowUuid((currentWorkflowUuid) =>
            templateIds.includes(currentWorkflowUuid) ? currentWorkflowUuid : (templateIds[0] ?? "")
          );
        }

        await loadReferences();
      } catch (loadError) {
        setProjectsError(loadError instanceof Error ? loadError.message : "Could not load catalog projects");
      } finally {
        setProjectsLoading(false);
      }
    },
    [loadReferences]
  );

  useEffect(() => {
    loadProjects(readSourceProperty(automationStarterSource, "name"));
  }, [loadProjects]);

  const deploy = async () => {
    setDeploying(true);
    setDeployError(null);
    setDeployWarnings(null);

    try {
      const response = await fetch("/api/code-playground/automation/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, source }),
      });

      const text = await response.text();

      if (!response.ok) {
        setDeployError(errorMessage(text, response.status));

        return;
      }

      const deployResult = (text ? JSON.parse(text) : {}) as DeployResultI;

      setDeployWarnings(deployResult.warnings ?? []);

      await loadProjects(readSourceProperty(source, "name"));
    } catch (deployFailure) {
      setDeployError(deployFailure instanceof Error ? deployFailure.message : "Deploy failed");
    } finally {
      setDeploying(false);
    }
  };

  const resetSource = () => {
    setSource(automationStarterSource);
    setFileName(automationStarterFileName);
    setDeployError(null);
    setDeployWarnings(null);
  };

  const perform = async (action: ActionType) => {
    setResult(null);
    setError(null);

    if (!workflowUuid) {
      setError("Select a workflow of the deployed project first.");

      return;
    }

    setPendingAction(action);

    const encodedUuid = encodeURIComponent(workflowUuid);

    try {
      if (action === "setUp") {
        setResult(await setUpReference(encodedUuid));
      } else if (action === "deprovision") {
        const response = await fetch(`/api/automation-workflow/${encodedUuid}/provision`, { method: "DELETE" });

        const text = await response.text();

        if (!response.ok) {
          throw new Error(errorMessage(text, response.status));
        }

        setResult(formatBody(text) || `Deprovisioned (HTTP ${response.status})`);
      } else {
        const body = runBodyJson.trim() ? JSON.stringify(JSON.parse(runBodyJson)) : undefined;

        const response = await fetch(`/api/request/${encodedUuid}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });

        const text = await response.text();

        if (!response.ok) {
          throw new Error(errorMessage(text, response.status));
        }

        setResult(formatBody(text) || `Run succeeded (HTTP ${response.status})`);
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Request failed");
    } finally {
      if (action !== "run") {
        await loadReferences().catch(() => undefined);
      }

      setPendingAction(null);
    }
  };

  // Provisions a reference to the catalog workflow when the connected user has none yet, then enables it if it is
  // still disabled. A redeploy needs neither: ByteChef rolls the new version out to existing references.
  const setUpReference = async (encodedUuid: string): Promise<string> => {
    const steps: string[] = [];

    let reference = (await loadReferences()).find((item) => item.catalogWorkflowUuid === workflowUuid);

    if (!reference) {
      const response = await fetch(`/api/automation-workflow/${encodedUuid}/provision`, { method: "POST" });

      const text = await response.text();

      if (!response.ok) {
        throw new Error(errorMessage(text, response.status));
      }

      steps.push("Provisioned a reference.");

      reference = (await loadReferences()).find((item) => item.catalogWorkflowUuid === workflowUuid);
    } else {
      steps.push("A reference already exists.");
    }

    if (reference && !reference.enabled) {
      const response = await fetch(`/api/automation-workflow/${encodedUuid}/enable`, { method: "POST" });

      const text = await response.text();

      if (!response.ok) {
        throw new Error(`${steps.join(" ")} Enabling failed: ${errorMessage(text, response.status)}`);
      }

      steps.push("Enabled it.");
    } else if (reference) {
      steps.push("It is enabled.");
    }

    steps.push("Run it below.");

    return steps.join(" ");
  };

  const project = projects.find((item) => String(item.id) === projectId);

  const workflows = (project?.workflowTemplates ?? [])
    .filter((template) => template.id)
    .map((template) => ({ label: template.label, workflowUuid: template.id! }));

  const selectedReference = references.find((reference) => reference.catalogWorkflowUuid === workflowUuid);

  const busy = pendingAction !== null;

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-xl font-semibold">Automation Code Playground</h1>

      <CodeEditorCard
        deploying={deploying}
        description={
          <>
            Edit a catalog code project and deploy it with{" "}
            <code>POST /api/embedded/v1/automation-project-code-workflows/deploy</code>. Deploying publishes it to the
            embedded catalog straight away; deploying a project with the same <code>name</code> again publishes a new
            version, which ByteChef rolls out to every reference already provisioned from it.
          </>
        }
        fileName={fileName}
        onDeploy={deploy}
        onFileNameChange={setFileName}
        onReset={resetSource}
        onSourceChange={setSource}
        source={source}
        title="1. Write and Deploy"
      >
        {deployError && (
          <pre className="overflow-auto whitespace-pre-wrap rounded-md bg-red-50 p-4 text-sm text-red-700">
            {deployError}
          </pre>
        )}

        {deployWarnings && deployWarnings.length === 0 && (
          <p className="rounded-md bg-green-50 p-4 text-sm text-green-700">Deployed without warnings.</p>
        )}

        {deployWarnings && deployWarnings.length > 0 && (
          <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-medium">Deployed with warnings:</p>

            <ul className="mt-2 list-disc space-y-1 pl-5">
              {deployWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </CodeEditorCard>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <CardTitle>2. Pick the Deployed Workflow</CardTitle>

            <CardDescription>
              The published catalog projects from <code>GET /api/embedded/v1/automation/projects</code>. After a deploy
              the project whose name matches the source&rsquo;s <code>name</code> is selected.
            </CardDescription>
          </div>

          <Button
            disabled={projectsLoading}
            onClick={() => loadProjects(project?.name)}
            size="sm"
            type="button"
            variant="outline"
          >
            <RefreshCwIcon className="mr-2 size-4" />
            Refresh
          </Button>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {projectsError && (
            <pre className="overflow-auto whitespace-pre-wrap rounded-md bg-red-50 p-4 text-sm text-red-700">
              {projectsError}
            </pre>
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
                      ? "No published projects yet: deploy one above"
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
            <WorkflowUuidList
              onSelect={setWorkflowUuid}
              renderActions={(workflow) => (
                <span className="text-xs text-muted-foreground">
                  {referenceStatus(
                    references.find((reference) => reference.catalogWorkflowUuid === workflow.workflowUuid)
                  )}
                </span>
              )}
              selectedWorkflowUuid={workflowUuid}
              workflows={workflows}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>3. Provision, Enable and Run</CardTitle>

            <CardDescription>
              Provisions a reference to the selected workflow for the connected user and enables it, then runs it
              through its request trigger.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Webhook URL</span>

              <code className="break-all rounded-md bg-muted p-2 text-xs">
                {workflowUuid
                  ? `POST ${BYTECHEF_APP_BASE_URL}/api/embedded/v1/workflows/${workflowUuid}`
                  : "Select a workflow above."}
              </code>

              <span className="text-xs text-muted-foreground">
                Called with the connected user&rsquo;s JWT. Status: {referenceStatus(selectedReference)}.
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <ActionButton
                action="setUp"
                disabled={busy || !workflowUuid}
                onClick={perform}
                pendingAction={pendingAction}
              />

              <ActionButton
                action="deprovision"
                disabled={busy || !selectedReference}
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

            <ActionButton
              action="run"
              disabled={busy || !workflowUuid}
              onClick={perform}
              pendingAction={pendingAction}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>

            <CardDescription>The response of the last action appears here.</CardDescription>
          </CardHeader>

          <CardContent>
            {busy && <p className="text-sm text-muted-foreground">Working...</p>}

            {error && (
              <pre className="overflow-auto whitespace-pre-wrap rounded-md bg-red-50 p-4 text-sm text-red-700">
                {error}
              </pre>
            )}

            {result && <pre className="overflow-auto whitespace-pre-wrap rounded-md bg-muted p-4 text-sm">{result}</pre>}

            {!busy && !error && !result && (
              <p className="text-sm text-muted-foreground">Deploy, provision and enable, then run the workflow.</p>
            )}
          </CardContent>
        </Card>
      </div>
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
    case "setUp":
      return "Provision and Enable";
    default:
      return "Run Workflow";
  }
}

function referenceStatus(reference: ReferenceI | undefined): string {
  if (!reference) {
    return "Not provisioned";
  }

  if (reference.dangling) {
    return "Needs attention";
  }

  return reference.enabled ? "Enabled" : "Disabled";
}
