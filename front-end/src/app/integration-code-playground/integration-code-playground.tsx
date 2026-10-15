"use client";

import { CodeEditorCard } from "@/components/code-playground/code-editor-card";
import { errorMessage, formatBody, readSourceProperty } from "@/components/code-playground/response-text";
import { integrationStarterFileName, integrationStarterSource } from "@/components/code-playground/starters";
import { WorkflowUuidList } from "@/components/playground/workflow-uuid-list";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BYTECHEF_APP_BASE_URL } from "@/lib/config";
import { cn } from "@/lib/utils";
import { ArrowRightIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ReactSVG from "react-inlinesvg";

const exampleRunBody = {
  maxResults: 5,
};

interface IntegrationI {
  componentName?: string;
  description?: string;
  icon?: string;
  id?: number;
  integrationInstances?: IntegrationInstanceI[];
  integrationVersion?: number;
  name?: string;
  title?: string;
  workflows?: IntegrationWorkflowI[];
}

interface IntegrationInstanceI {
  id?: number;
  workflows?: IntegrationInstanceWorkflowI[];
}

interface IntegrationInstanceWorkflowI {
  enabled?: boolean;
  workflowUuid?: string;
}

interface IntegrationWorkflowI {
  label?: string;
  workflowUuid?: string;
}

type ActionType = "enable" | "run";

export function IntegrationCodePlayground() {
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deploySucceeded, setDeploySucceeded] = useState(false);
  const [deployedComponentName, setDeployedComponentName] = useState<string | undefined>(
    readSourceProperty(integrationStarterSource, "componentName")
  );
  const [deployedDescription, setDeployedDescription] = useState<string | undefined>(
    readSourceProperty(integrationStarterSource, "description")
  );
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState(integrationStarterFileName);
  const [integrationDetail, setIntegrationDetail] = useState<IntegrationI | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationI[]>([]);
  const [integrationsError, setIntegrationsError] = useState<string | null>(null);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<ActionType | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [runBodyJson, setRunBodyJson] = useState(JSON.stringify(exampleRunBody, null, 2));
  const [source, setSource] = useState(integrationStarterSource);
  const [workflowUuid, setWorkflowUuid] = useState("");

  const loadIntegrations = useCallback(async () => {
    setIntegrationsLoading(true);
    setIntegrationsError(null);

    try {
      const response = await fetch("/api/integrations");

      const text = await response.text();

      if (!response.ok) {
        setIntegrationsError(errorMessage(text, response.status));

        return;
      }

      setIntegrations((text ? JSON.parse(text) : []) as IntegrationI[]);
    } catch (loadError) {
      setIntegrationsError(loadError instanceof Error ? loadError.message : "Could not load integrations");
    } finally {
      setIntegrationsLoading(false);
    }
  }, []);

  const deploy = async () => {
    setDeploying(true);
    setDeployError(null);
    setDeploySucceeded(false);

    try {
      const response = await fetch("/api/code-playground/integration/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, source }),
      });

      if (!response.ok) {
        setDeployError(errorMessage(await response.text(), response.status));

        return;
      }

      setDeploySucceeded(true);
      setDeployedComponentName(readSourceProperty(source, "componentName"));
      setDeployedDescription(readSourceProperty(source, "description"));

      await loadIntegrations();
    } catch (deployFailure) {
      setDeployError(deployFailure instanceof Error ? deployFailure.message : "Deploy failed");
    } finally {
      setDeploying(false);
    }
  };

  const resetSource = () => {
    setSource(integrationStarterSource);
    setFileName(integrationStarterFileName);
    setDeployError(null);
    setDeploySucceeded(false);
  };

  // A code integration is keyed by its component, but a visual integration on the same component can exist too, so the
  // one whose description matches the source's is preferred.
  const componentIntegrations = integrations.filter(
    (integration) => deployedComponentName && integration.componentName === deployedComponentName
  );

  const deployedIntegration =
    componentIntegrations.find((integration) => integration.description === deployedDescription) ??
    componentIntegrations[0];

  const deployedIntegrationFound = deployedIntegration !== undefined;

  const deployedIntegrationId = deployedIntegration?.id;

  // GET /integrations lists integrations without their workflows; GET /integrations/{id} has them, plus the connected
  // user's instances and which workflows are enabled on them.
  const loadIntegrationDetail = useCallback(async () => {
    if (deployedIntegrationId === undefined) {
      setIntegrationDetail(null);

      return;
    }

    try {
      const response = await fetch(`/api/integrations/${deployedIntegrationId}`);

      const text = await response.text();

      setIntegrationDetail(response.ok && text ? (JSON.parse(text) as IntegrationI) : null);
    } catch {
      setIntegrationDetail(null);
    }
  }, [deployedIntegrationId]);

  // The connected user's instance of the deployed integration: it exists once they have connected it.
  const integrationInstance = integrationDetail?.integrationInstances?.[0];

  const workflows = (integrationDetail?.workflows ?? [])
    .filter((workflow) => workflow.workflowUuid)
    .map((workflow) => ({ label: workflow.label, workflowUuid: workflow.workflowUuid! }));

  const selectedWorkflowUuid = workflows.some((workflow) => workflow.workflowUuid === workflowUuid)
    ? workflowUuid
    : (workflows[0]?.workflowUuid ?? "");

  const busy = pendingAction !== null;

  const perform = async (action: ActionType) => {
    setResult(null);
    setError(null);

    if (!selectedWorkflowUuid) {
      setError("Deploy the integration first.");

      return;
    }

    setPendingAction(action);

    const encodedUuid = encodeURIComponent(selectedWorkflowUuid);

    try {
      if (action === "enable") {
        if (!integrationInstance?.id) {
          throw new Error("Connect the integration on the Integrations page first.");
        }

        const response = await fetch(
          `/api/integration-instances/${integrationInstance.id}/workflows/${encodedUuid}/enable`,
          { method: "POST" }
        );

        const text = await response.text();

        if (!response.ok) {
          throw new Error(errorMessage(text, response.status));
        }

        setResult(formatBody(text) || "Enabled. Run it below.");

        await loadIntegrations();
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
      setPendingAction(null);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  useEffect(() => {
    loadIntegrationDetail();
  }, [integrations, loadIntegrationDetail]);

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-xl font-semibold">Integration Code Playground</h1>

      <CodeEditorCard
        deploying={deploying}
        description={
          <>
            Edit a code integration and deploy it with{" "}
            <code>POST /api/embedded/v1/integration-code-workflows/deploy?enable=true</code>. A code integration is
            keyed by its <code>componentName</code>: deploying again for the same component publishes a new version of
            it. <code>enable=true</code> also enables it in this environment, so connected users can connect it right
            away.
            <span className="mt-2 block">
              Gmail needs OAuth app credentials, so prepare the code integration in ByteChef once before the first
              deploy: <strong>Embedded &rsaquo; Integrations &rsaquo; New Code Integration</strong> (JavaScript, Gmail
              component, a name such as <code>Gmail Code</code>), then{" "}
              <strong>Integration Configurations &rsaquo; New</strong> for it with your Google OAuth client id and
              secret, enabled. Deploying here then updates that integration and keeps its credentials.
            </span>
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

        {deploySucceeded && (
          <p className="rounded-md bg-green-50 p-4 text-sm text-green-700">
            Deployed and enabled. Connect it from the{" "}
            <Link className="font-medium underline" href="/integrations">
              Integrations
            </Link>{" "}
            page.
          </p>
        )}
      </CodeEditorCard>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <CardTitle>2. Connect It</CardTitle>

            <CardDescription>
              The connected user&rsquo;s integrations from <code>GET /api/embedded/v1/integrations</code>. The one built
              on <code>{deployedComponentName ?? "your component"}</code> is highlighted.
            </CardDescription>
          </div>

          <Button disabled={integrationsLoading} onClick={loadIntegrations} size="sm" type="button" variant="outline">
            <RefreshCwIcon className="mr-2 size-4" />
            Refresh
          </Button>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {integrationsError && (
            <pre className="overflow-auto whitespace-pre-wrap rounded-md bg-red-50 p-4 text-sm text-red-700">
              {integrationsError}
            </pre>
          )}

          {!integrationsError && integrations.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {integrationsLoading ? "Loading..." : "No integrations are enabled in this environment yet."}
            </p>
          )}

          {!integrationsError && integrations.length > 0 && !deployedIntegrationFound && (
            <p className="text-sm text-muted-foreground">
              No integration built on <code>{deployedComponentName ?? "your component"}</code> is listed yet. Deploy it
              above.
            </p>
          )}

          {integrations.length > 0 && (
            <ul className="divide-y rounded-md border">
              {integrations.map((integration) => {
                const deployed = deployedIntegration !== undefined && integration.id === deployedIntegration.id;

                return (
                  <li
                    className={cn(
                      "flex items-center justify-between gap-4 px-4 py-3",
                      deployed && "bg-green-50 ring-1 ring-inset ring-green-300"
                    )}
                    key={integration.id}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {integration.icon && <ReactSVG className="size-8 shrink-0" src={integration.icon} />}

                      <div className="flex min-w-0 flex-col">
                        <span className="text-sm font-medium">
                          {integration.title || integration.name || integration.componentName}

                          {deployed && <span className="ml-2 text-xs font-normal text-green-700">Just deployed</span>}
                        </span>

                        <span className="truncate text-xs text-muted-foreground">
                          <code>{integration.componentName}</code>
                          {integration.integrationVersion !== undefined && ` · version ${integration.integrationVersion}`}
                          {` · ${integration.integrationInstances?.length ? "connected" : "not connected"}`}
                        </span>
                      </div>
                    </div>

                    {deployed && (
                      <Link className={buttonVariants({ size: "sm", variant: "outline" })} href="/integrations">
                        Connect on Integrations
                        <ArrowRightIcon className="ml-2 size-4" />
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>3. Enable and Run</CardTitle>

            <CardDescription>
              Enables the selected workflow on the connected user&rsquo;s integration instance with{" "}
              <code>POST /api/embedded/v1/integration-instances/{"{id}"}/workflows/{"{workflowUuid}"}/enable</code>,
              then runs it through its request trigger. A workflow started by a Gmail trigger needs no call: once enabled
              it runs whenever an email arrives.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            {workflows.length === 0 && (
              <p className="text-sm text-muted-foreground">Deploy the integration above to list its workflows.</p>
            )}

            {workflows.length > 0 && (
              <WorkflowUuidList
                onSelect={setWorkflowUuid}
                renderActions={(workflow) => (
                  <span className="text-xs text-muted-foreground">
                    {instanceWorkflowStatus(integrationInstance, workflow.workflowUuid)}
                  </span>
                )}
                selectedWorkflowUuid={selectedWorkflowUuid}
                workflows={workflows}
              />
            )}

            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Webhook URL</span>

              <code className="break-all rounded-md bg-muted p-2 text-xs">
                {selectedWorkflowUuid
                  ? `POST ${BYTECHEF_APP_BASE_URL}/api/embedded/v1/workflows/${selectedWorkflowUuid}`
                  : "Deploy the integration above."}
              </code>

              <span className="text-xs text-muted-foreground">Called with the connected user&rsquo;s JWT.</span>
            </div>

            <ActionButton
              action="enable"
              disabled={busy || !selectedWorkflowUuid || !integrationInstance}
              onClick={perform}
              pendingAction={pendingAction}
            />

            {deployedIntegrationFound && !integrationInstance && (
              <p className="text-sm text-muted-foreground">
                Connect the integration on the{" "}
                <Link className="font-medium underline" href="/integrations">
                  Integrations
                </Link>{" "}
                page first.
              </p>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="integrationRunBodyJson">Run body (JSON, optional)</Label>

              <Textarea
                className="font-mono text-sm"
                id="integrationRunBodyJson"
                onChange={(event) => setRunBodyJson(event.target.value)}
                rows={4}
                value={runBodyJson}
              />
            </div>

            <ActionButton
              action="run"
              disabled={busy || !selectedWorkflowUuid}
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
              <p className="text-sm text-muted-foreground">Deploy, connect and enable, then run the workflow.</p>
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
}

function ActionButton({ action, disabled, onClick, pendingAction }: ActionButtonProps) {
  return (
    <Button disabled={disabled} onClick={() => onClick(action)} type="button">
      {pendingAction === action && <Loader2Icon className="mr-2 size-4 animate-spin" />}
      {action === "enable" ? "Enable Workflow" : "Run Workflow"}
    </Button>
  );
}

function instanceWorkflowStatus(integrationInstance: IntegrationInstanceI | undefined, workflowUuid: string): string {
  if (!integrationInstance) {
    return "Not connected";
  }

  const instanceWorkflow = integrationInstance.workflows?.find((workflow) => workflow.workflowUuid === workflowUuid);

  return instanceWorkflow?.enabled ? "Enabled" : "Disabled";
}
