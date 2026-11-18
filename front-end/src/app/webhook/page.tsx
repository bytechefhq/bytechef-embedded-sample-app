"use client";

import { ActivationDialogOpener } from "@/components/activation-dialog-opener";
import { PrepareWorkflowCard } from "@/components/playground/prepare-workflow-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getToken } from "@/lib/api";
import { BYTECHEF_APP_BASE_URL, BYTECHEF_ENVIRONMENT } from "@/lib/config";
import { useConnectDialog } from "@bytechef/embedded";
import { CheckIcon, CopyIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type FlowType = "automation" | "integration";

const sampleWorkflow = {
  label: "Webhook Echo",
  description: "Created from the Webhook Playground. Answers right away with JSON, then logs what it received.",
  inputs: [],
  triggers: [
    {
      label: "Auto Respond",
      name: "trigger_1",
      type: "webhook/v1/autoRespondWithHTTP200",
      parameters: {
        body: { received: true },
        responseType: "JSON",
        statusCode: 202,
      },
    },
  ],
  tasks: [
    {
      label: "Log request",
      name: "logger_1",
      type: "logger/v1/info",
      parameters: {
        text: "Webhook received: ${trigger_1.body}",
      },
    },
  ],
};

const sampleWorkflowJson = JSON.stringify(sampleWorkflow, null, 2);

const exampleBody = {
  message: "Hello from the Webhook Playground",
};

interface AutomationI {
  automationUuid?: string;
  definition?: string;
  enabled?: boolean;
  kind?: "COPY" | "REFERENCE";
  label?: string;
  staticWebhookUrl?: string;
  workflowUuid?: string;
}

interface AutomationHubProjectI {
  workflowTemplates?: { components?: { name?: string }[]; id?: string; label?: string }[];
}

interface WebhookTemplateI {
  activated: boolean;
  id: string;
  label?: string;
}

function startsWithWebhookTrigger(automation: AutomationI): boolean {
  if (automation.staticWebhookUrl) {
    return true;
  }

  try {
    const { triggers } = JSON.parse(automation.definition ?? "{}") as { triggers?: { type?: string }[] };

    return (triggers ?? []).some((trigger) => trigger.type?.startsWith("webhook/"));
  } catch {
    return false;
  }
}

interface IntegrationI {
  id?: number;
  integrationInstances?: IntegrationInstanceI[];
  name?: string;
  workflows?: { label?: string; staticWebhookTrigger?: boolean; workflowUuid?: string }[];
}

interface IntegrationInstanceI {
  id?: number;
  workflows?: { enabled?: boolean; staticWebhookUrl?: string; workflowUuid?: string }[];
}

interface WebhookCallResultI {
  body: string;
  contentType: string | null;
  location: string | null;
  status: number;
}

interface WebhookWorkflowI {
  enabled: boolean;
  label?: string;
  staticWebhookUrl?: string;
  workflowUuid: string;
}

export default function WebhookPage() {
  const [bodyJson, setBodyJson] = useState(JSON.stringify(exampleBody, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [flowType, setFlowType] = useState<FlowType>("integration");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WebhookCallResultI | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setError(null);
    setResult(null);

    if (!webhookUrl.trim()) {
      setError("Webhook URL is required.");

      return;
    }

    setLoading(true);

    try {
      const body = bodyJson.trim() ? JSON.stringify(JSON.parse(bodyJson)) : undefined;

      const response = await fetch("/api/webhook-call", {
        body: JSON.stringify({ body, method: "POST", url: webhookUrl.trim() }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      const text = await response.text();

      if (!response.ok) {
        setError(formatBody(text) || `HTTP ${response.status}`);

        return;
      }

      setResult(JSON.parse(text) as WebhookCallResultI);
    } catch (callError) {
      setError(callError instanceof Error ? callError.message : "Could not call the webhook");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-xl font-semibold">Webhook Playground</h1>

      <div className="flex gap-2">
        <Button
          onClick={() => setFlowType("integration")}
          type="button"
          variant={flowType === "integration" ? "default" : "outline"}
        >
          Integration
        </Button>

        <Button
          onClick={() => setFlowType("automation")}
          type="button"
          variant={flowType === "automation" ? "default" : "outline"}
        >
          Automation
        </Button>
      </div>

      <PrepareWorkflowCard
        description={
          <>
            A workflow that starts with the <strong>Webhook</strong> trigger gets its own URL for every connected user.
            Anything that can send an HTTP request, for example a link in an email or another service, can start it. No
            token is needed.
          </>
        }
        sampleWorkflowJson={sampleWorkflowJson}
        steps={flowType === "integration" ? <IntegrationSteps /> : <AutomationSteps />}
        title="1. Prepare the Workflow in ByteChef"
      />

      {flowType === "integration" ? (
        <IntegrationWebhooksCard onSelect={setWebhookUrl} selectedWebhookUrl={webhookUrl.trim()} />
      ) : (
        <AutomationWebhooksCard onSelect={setWebhookUrl} selectedWebhookUrl={webhookUrl.trim()} />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>3. Call the Webhook</CardTitle>

            <CardDescription>
              Sends <code>POST</code> to the webhook URL from this app&rsquo;s server, the way an outside service would.
              The <strong>Auto Respond</strong> trigger answers right away with the response it is configured with, here{" "}
              <code>202</code> and <code>{`{"received": true}`}</code>, and runs the workflow in the background.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2">
                <Label htmlFor="webhookUrl">Webhook URL</Label>

                <Input
                  id="webhookUrl"
                  onChange={(event) => setWebhookUrl(event.target.value)}
                  placeholder={`${BYTECHEF_APP_BASE_URL}/webhooks/...`}
                  value={webhookUrl}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="bodyJson">Body (JSON, optional)</Label>

                <Textarea
                  className="font-mono text-sm"
                  id="bodyJson"
                  onChange={(event) => setBodyJson(event.target.value)}
                  rows={8}
                  value={bodyJson}
                />
              </div>

              <Button disabled={loading} type="submit">
                {loading && <Loader2Icon className="mr-2 size-4 animate-spin" />}
                Call Webhook
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>

            <CardDescription>The webhook&rsquo;s response will appear here.</CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-2">
            {loading && <p className="text-sm text-muted-foreground">Calling...</p>}

            {error && <pre className="overflow-auto rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</pre>}

            {result && (
              <>
                <p className="text-sm">
                  <strong>HTTP {result.status}</strong>
                  {result.contentType && <span className="text-muted-foreground"> &middot; {result.contentType}</span>}
                </p>

                {result.location && (
                  <p className="break-all text-sm">
                    Redirects to <code>{result.location}</code>
                  </p>
                )}

                <pre className="overflow-auto rounded-md bg-muted p-4 text-sm">
                  {formatBody(result.body) || "(empty body)"}
                </pre>
              </>
            )}

            {!loading && !error && !result && (
              <p className="text-sm text-muted-foreground">Submit the form to call the webhook.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function IntegrationSteps() {
  return (
    <>
      <li>
        In ByteChef, open <strong>Embedded &rsaquo; Integrations</strong> and create an integration for a component with
        a connection.
      </li>

      <li>
        Create a workflow in the integration, open the <strong>Workflow Code Editor</strong> from the right sidebar,
        replace the definition with the workflow below and save.
      </li>

      <li>
        <strong>Publish</strong> the integration from the editor header.
      </li>

      <li>
        In <strong>Embedded &rsaquo; Integration Instances</strong>, create an instance configuration for the published
        version, then enable it and the workflow.
      </li>

      <li>
        In this app&rsquo;s <strong>Integrations</strong> page, connect the integration as the demo user.
      </li>

      <li>
        In step 2, enable the workflow for the demo user. Its webhook URL appears once it is enabled, both here and in
        the Connect dialog, where the connected user can copy it.
      </li>
    </>
  );
}

function AutomationSteps() {
  return (
    <>
      <li>
        In ByteChef, open <strong>Embedded &rsaquo; Automations</strong> and create a project with{" "}
        <strong>Show in Automation Hub</strong> on.
      </li>

      <li>
        Create a workflow in the project, open its code editor, replace the definition with the workflow below and save.
      </li>

      <li>
        Publish the project from its <strong>&#8942;</strong> menu.
      </li>

      <li>
        Expand the project, open its <strong>Configurations</strong> tab and create a configuration for this app&rsquo;s
        environment, enabled and pinned to the published version.
      </li>

      <li>
        In this app&rsquo;s <strong>Automation Hub</strong> page, click <strong>Use</strong> on the template.
      </li>

      <li>
        In step 2, enable the automation and copy its webhook URL. The connected user can copy it in the{" "}
        <strong>Activation Dialog</strong>, opened here with <strong>Open Activation Dialog</strong>, or in the
        Automation Hub from the card&rsquo;s <strong>&#8942;</strong> menu, with <strong>Copy webhook URL</strong>.
      </li>
    </>
  );
}

interface WebhooksCardProps {
  onSelect: (webhookUrl: string) => void;
  selectedWebhookUrl: string;
}

function IntegrationWebhooksCard({ onSelect, selectedWebhookUrl }: WebhooksCardProps) {
  const [connectDialogIntegrationId, setConnectDialogIntegrationId] = useState<string | null>(null);
  const [enableError, setEnableError] = useState<string | null>(null);
  const [enablingWorkflowUuid, setEnablingWorkflowUuid] = useState<string | null>(null);
  const [integration, setIntegration] = useState<IntegrationI | null>(null);
  const [integrationError, setIntegrationError] = useState<string | null>(null);
  const [integrationId, setIntegrationId] = useState("");
  const [integrationLoading, setIntegrationLoading] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationI[]>([]);
  const [integrationsError, setIntegrationsError] = useState<string | null>(null);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [jwtToken, setJwtToken] = useState<string | null>(null);

  const integrationIdRef = useRef("");

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

      const integrationSummaries = (text ? JSON.parse(text) : []) as IntegrationI[];

      const integrationDetails = await Promise.all(
        integrationSummaries
          .filter((integrationSummary) => integrationSummary.id != null)
          .map(async (integrationSummary) => {
            const detailResponse = await fetch(`/api/integrations/${integrationSummary.id}`);

            return detailResponse.ok ? ((await detailResponse.json()) as IntegrationI) : null;
          }),
      );

      const webhookIntegrations = integrationDetails.filter(
        (integrationDetail): integrationDetail is IntegrationI =>
          !!integrationDetail?.workflows?.some((workflow) => workflow.staticWebhookTrigger),
      );

      setIntegrations(webhookIntegrations);

      const selectedIntegration =
        webhookIntegrations.find((webhookIntegration) => String(webhookIntegration.id) === integrationIdRef.current) ??
        webhookIntegrations[0] ??
        null;

      const selectedIntegrationId = selectedIntegration?.id != null ? String(selectedIntegration.id) : "";

      integrationIdRef.current = selectedIntegrationId;

      setIntegration(selectedIntegration);
      setIntegrationId(selectedIntegrationId);
    } catch (loadError) {
      setIntegrationsError(loadError instanceof Error ? loadError.message : "Could not load integrations");
    } finally {
      setIntegrationsLoading(false);
    }
  }, []);

  const loadIntegration = useCallback(async (id: string) => {
    integrationIdRef.current = id;

    setIntegrationId(id);
    setIntegrationError(null);
    setEnableError(null);

    if (!id) {
      setIntegration(null);

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
  }, []);

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
        { method: "POST" },
      );

      if (!response.ok) {
        setEnableError(formatBody(await response.text()) || `HTTP ${response.status}`);

        return;
      }

      await loadIntegration(integrationId);
    } catch (enableWorkflowError) {
      setEnableError(
        enableWorkflowError instanceof Error ? enableWorkflowError.message : "Could not enable the workflow",
      );
    } finally {
      setEnablingWorkflowUuid(null);
    }
  };

  const openConnectDialog = async () => {
    setJwtToken(await getToken());
    setConnectDialogIntegrationId(integrationId);
  };

  const closeConnectDialog = useCallback(() => {
    setConnectDialogIntegrationId(null);

    loadIntegration(integrationId);
  }, [integrationId, loadIntegration]);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  const workflows: WebhookWorkflowI[] = (integration?.workflows ?? [])
    .filter((workflow) => workflow.workflowUuid && workflow.staticWebhookTrigger)
    .map((workflow) => {
      const instanceWorkflow = integrationInstance?.workflows?.find(
        (curInstanceWorkflow) => curInstanceWorkflow.workflowUuid === workflow.workflowUuid,
      );

      return {
        enabled: instanceWorkflow?.enabled ?? false,
        label: workflow.label,
        staticWebhookUrl: instanceWorkflow?.enabled ? instanceWorkflow.staticWebhookUrl : undefined,
        workflowUuid: workflow.workflowUuid!,
      };
    });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <CardTitle>2. Find the Webhook URL</CardTitle>

          <CardDescription>
            Reads the connected user&rsquo;s integration with <code>GET /api/embedded/v1/integrations/{`{id}`}</code>.
            Each enabled workflow of the user&rsquo;s integration instance carries its <code>staticWebhookUrl</code>,
            the same URL the <strong>Connect dialog</strong> shows with a Copy button.
          </CardDescription>
        </div>

        <Button disabled={integrationsLoading} onClick={loadIntegrations} size="sm" type="button" variant="outline">
          <RefreshCwIcon className="mr-2 size-4" />
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {integrationsError && <ErrorBlock message={integrationsError} />}

        {!integrationsError && (
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="integrationId">Integration</Label>

              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
                disabled={integrationsLoading || integrations.length === 0}
                id="integrationId"
                onChange={(event) => loadIntegration(event.target.value)}
                value={integrationId}
              >
                {integrations.length === 0 && (
                  <option value="">
                    {integrationsLoading ? "Loading..." : "No integrations with webhook workflows"}
                  </option>
                )}

                {integrations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {`${item.name || `Integration ${item.id}`}${item.integrationInstances?.length ? "" : " (not connected)"}`}
                  </option>
                ))}
              </select>
            </div>

            <Button disabled={!integration} onClick={openConnectDialog} type="button" variant="outline">
              Open Connect Dialog
            </Button>
          </div>
        )}

        {integrationLoading && <p className="text-sm text-muted-foreground">Loading workflows...</p>}

        {integrationError && <ErrorBlock message={integrationError} />}

        {integration && !integrationInstance && (
          <p className="text-sm text-muted-foreground">
            The demo user hasn&rsquo;t connected this integration yet. Click <strong>Open Connect Dialog</strong> to
            connect it, or connect it on the <strong>Integrations</strong> page.
          </p>
        )}

        {enableError && <ErrorBlock message={enableError} />}

        {integration && workflows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            This integration has no workflows that start with a webhook trigger.
          </p>
        )}

        {integrationInstance && workflows.length > 0 && (
          <WebhookWorkflowList
            enablingWorkflowUuid={enablingWorkflowUuid}
            onEnable={enableWorkflow}
            onSelect={onSelect}
            selectedWebhookUrl={selectedWebhookUrl}
            workflows={workflows}
          />
        )}

        {connectDialogIntegrationId && jwtToken && (
          <ConnectDialogOpener
            integrationId={connectDialogIntegrationId}
            jwtToken={jwtToken}
            onDone={closeConnectDialog}
          />
        )}
      </CardContent>
    </Card>
  );
}

function AutomationWebhooksCard({ onSelect, selectedWebhookUrl }: WebhooksCardProps) {
  const [automations, setAutomations] = useState<AutomationI[]>([]);
  const [automationsError, setAutomationsError] = useState<string | null>(null);
  const [automationsLoading, setAutomationsLoading] = useState(false);
  const [enableError, setEnableError] = useState<string | null>(null);
  const [enablingWorkflowUuid, setEnablingWorkflowUuid] = useState<string | null>(null);
  const [activationDialogTemplateId, setActivationDialogTemplateId] = useState<string | null>(null);
  const [activationTemplateId, setActivationTemplateId] = useState("");
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [webhookTemplates, setWebhookTemplates] = useState<WebhookTemplateI[]>([]);

  const loadAutomations = useCallback(async () => {
    setAutomationsLoading(true);
    setAutomationsError(null);

    try {
      const [workflowsResponse, projectsResponse] = await Promise.all([
        fetch("/api/automation/workflows"),
        fetch("/api/automation/projects"),
      ]);

      const workflowsText = await workflowsResponse.text();
      const projectsText = await projectsResponse.text();

      if (!workflowsResponse.ok || !projectsResponse.ok) {
        setAutomationsError(
          formatBody(workflowsResponse.ok ? projectsText : workflowsText) ||
            `HTTP ${workflowsResponse.ok ? projectsResponse.status : workflowsResponse.status}`,
        );

        return;
      }

      const loadedAutomations = (workflowsText ? JSON.parse(workflowsText) : []) as AutomationI[];
      const automationHubProjects = (projectsText ? JSON.parse(projectsText) : []) as AutomationHubProjectI[];

      const activatedTemplateUuids = new Set(
        loadedAutomations
          .filter((automation) => automation.kind === "REFERENCE" && automation.automationUuid)
          .map((automation) => automation.automationUuid!),
      );

      const loadedWebhookTemplates: WebhookTemplateI[] = automationHubProjects
        .flatMap((automationHubProject) => automationHubProject.workflowTemplates ?? [])
        .filter(
          (workflowTemplate) =>
            workflowTemplate.id && workflowTemplate.components?.some((component) => component.name === "webhook"),
        )
        .map((workflowTemplate) => ({
          activated: activatedTemplateUuids.has(workflowTemplate.id!),
          id: workflowTemplate.id!,
          label: workflowTemplate.label,
        }));

      setAutomations(loadedAutomations);
      setWebhookTemplates(loadedWebhookTemplates);

      setActivationTemplateId((currentTemplateId) =>
        loadedWebhookTemplates.some((webhookTemplate) => webhookTemplate.id === currentTemplateId)
          ? currentTemplateId
          : (loadedWebhookTemplates[0]?.id ?? ""),
      );
    } catch (loadError) {
      setAutomationsError(loadError instanceof Error ? loadError.message : "Could not load automations");
    } finally {
      setAutomationsLoading(false);
    }
  }, []);

  const enableAutomation = async (workflowUuid: string) => {
    setEnableError(null);
    setEnablingWorkflowUuid(workflowUuid);

    try {
      const response = await fetch(`/api/automation/${encodeURIComponent(workflowUuid)}/enable`, { method: "POST" });

      if (!response.ok) {
        setEnableError(formatBody(await response.text()) || `HTTP ${response.status}`);

        return;
      }

      await loadAutomations();
    } catch (enableAutomationError) {
      setEnableError(
        enableAutomationError instanceof Error ? enableAutomationError.message : "Could not enable the automation",
      );
    } finally {
      setEnablingWorkflowUuid(null);
    }
  };

  const openActivationDialog = async () => {
    setJwtToken(await getToken());
    setActivationDialogTemplateId(activationTemplateId);
  };

  const closeActivationDialog = useCallback(() => {
    setActivationDialogTemplateId(null);

    loadAutomations();
  }, [loadAutomations]);

  useEffect(() => {
    loadAutomations();
  }, [loadAutomations]);

  const webhookAutomations = automations.filter(startsWithWebhookTrigger);

  const workflows: WebhookWorkflowI[] = webhookAutomations
    .filter((automation) => automation.workflowUuid)
    .map((automation) => ({
      enabled: automation.enabled ?? false,
      label: automation.label,
      staticWebhookUrl: automation.staticWebhookUrl,
      workflowUuid: automation.workflowUuid!,
    }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <CardTitle>2. Find the Webhook URL</CardTitle>

          <CardDescription>
            Lists the connected user&rsquo;s automations with <code>GET /api/embedded/v1/automation/workflows</code>.
            Each automation that starts with a static webhook trigger carries its <code>staticWebhookUrl</code>, the
            same URL the connected user copies from the <strong>Activation Dialog</strong> or from the{" "}
            <strong>Automation Hub</strong> card&rsquo;s <strong>Copy webhook URL</strong>.
          </CardDescription>
        </div>

        <Button disabled={automationsLoading} onClick={loadAutomations} size="sm" type="button" variant="outline">
          <RefreshCwIcon className="mr-2 size-4" />
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="activationTemplateId">Automation</Label>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
              disabled={automationsLoading || webhookTemplates.length === 0}
              id="activationTemplateId"
              onChange={(event) => setActivationTemplateId(event.target.value)}
              value={activationTemplateId}
            >
              {webhookTemplates.length === 0 && (
                <option value="">
                  {automationsLoading ? "Loading..." : "No webhook automations in the Automation Hub"}
                </option>
              )}

              {webhookTemplates.map((webhookTemplate) => (
                <option key={webhookTemplate.id} value={webhookTemplate.id}>
                  {`${webhookTemplate.label || "Untitled"}${webhookTemplate.activated ? "" : " (not activated)"}`}
                </option>
              ))}
            </select>
          </div>

          <Button disabled={!activationTemplateId} onClick={openActivationDialog} type="button" variant="outline">
            Open Activation Dialog
          </Button>
        </div>

        {automationsLoading && <p className="text-sm text-muted-foreground">Loading automations...</p>}

        {automationsError && <ErrorBlock message={automationsError} />}

        {enableError && <ErrorBlock message={enableError} />}

        {!automationsLoading && !automationsError && workflows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            The demo user has no automations that start with a webhook trigger yet. Pick one above and click{" "}
            <strong>Open Activation Dialog</strong> to activate it, or click <strong>Use</strong> on it in the{" "}
            <strong>Automation Hub</strong> page.
          </p>
        )}

        {workflows.length > 0 && (
          <WebhookWorkflowList
            enablingWorkflowUuid={enablingWorkflowUuid}
            onEnable={enableAutomation}
            onSelect={onSelect}
            selectedWebhookUrl={selectedWebhookUrl}
            workflows={workflows}
          />
        )}

        {activationDialogTemplateId && jwtToken && (
          <ActivationDialogOpener
            jwtToken={jwtToken}
            onDone={closeActivationDialog}
            workflowTemplateId={activationDialogTemplateId}
          />
        )}
      </CardContent>
    </Card>
  );
}

interface WebhookWorkflowListProps {
  enablingWorkflowUuid: string | null;
  onEnable: (workflowUuid: string) => void;
  onSelect: (webhookUrl: string) => void;
  selectedWebhookUrl: string;
  workflows: WebhookWorkflowI[];
}

function WebhookWorkflowList({
  enablingWorkflowUuid,
  onEnable,
  onSelect,
  selectedWebhookUrl,
  workflows,
}: WebhookWorkflowListProps) {
  return (
    <ul className="divide-y rounded-md border">
      {workflows.map((workflow) => {
        const { enabled, label, staticWebhookUrl, workflowUuid } = workflow;

        const selected = !!staticWebhookUrl && staticWebhookUrl === selectedWebhookUrl;

        return (
          <li className="flex items-center justify-between gap-4 px-4 py-2" key={workflowUuid}>
            <div className="flex min-w-0 flex-col">
              <span className="text-sm font-medium">{label || "Untitled"}</span>

              {staticWebhookUrl ? (
                <span className="truncate font-mono text-xs text-muted-foreground" title={staticWebhookUrl}>
                  {staticWebhookUrl}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Enable the workflow to get its webhook URL.</span>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {!enabled && (
                <Button
                  disabled={enablingWorkflowUuid !== null}
                  onClick={() => onEnable(workflowUuid)}
                  size="sm"
                  type="button"
                >
                  {enablingWorkflowUuid === workflowUuid && <Loader2Icon className="mr-2 size-4 animate-spin" />}
                  Enable
                </Button>
              )}

              {staticWebhookUrl && (
                <>
                  <CopyButton value={staticWebhookUrl} />

                  <Button
                    disabled={selected}
                    onClick={() => onSelect(staticWebhookUrl)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {selected && <CheckIcon className="mr-2 size-4" />}
                    {selected ? "Selected" : "Use"}
                  </Button>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copyValue = async () => {
    await navigator.clipboard.writeText(value);

    setCopied(true);

    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button aria-label="Copy webhook URL" onClick={copyValue} size="sm" type="button" variant="outline">
      {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
    </Button>
  );
}

function ConnectDialogOpener({
  integrationId,
  jwtToken,
  onDone,
}: {
  integrationId: string;
  jwtToken: string;
  onDone: () => void;
}) {
  const { closeDialog, openDialog } = useConnectDialog({
    baseUrl: BYTECHEF_APP_BASE_URL,
    environment: BYTECHEF_ENVIRONMENT,
    integrationId,
    jwtToken,
  });

  useEffect(() => {
    openDialog();

    const observer = new MutationObserver(() => {
      const portal = document.getElementById("connect-dialog-portal");

      if (portal && portal.childNodes.length === 0) {
        onDone();
      }
    });

    const portal = document.getElementById("connect-dialog-portal");

    if (portal) {
      observer.observe(portal, { childList: true });
    }

    return () => {
      observer.disconnect();
      closeDialog();
    };
  }, []);

  return null;
}

function ErrorBlock({ message }: { message: string }) {
  return <pre className="overflow-auto rounded-md bg-red-50 p-4 text-sm text-red-700">{message}</pre>;
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
