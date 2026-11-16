"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { BotIcon, InfoIcon, Loader2Icon, PencilIcon, PlugIcon, RefreshCwIcon, Trash2Icon, WrenchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  type AutomationProject,
  deprovisionWorkflowReference,
  enableMcpIntegrationTool,
  enableMcpIntegrationWorkflow,
  enableMcpWorkflow,
  fetchAutomationProjects,
  fetchIntegration,
  fetchIntegrations,
  fetchWorkflows,
  getToken,
  type Integration,
  type IntegrationDetails,
  type Workflow,
} from "@/lib/api";
import { cn } from "@/lib/utils";

import { ActivationDialogOpener, ConnectDialogOpener } from "./dialogOpeners";

type McpToolSummary = {
  description?: string;
  integrationId?: number;
  name: string;
  title?: string;
};

type ToolIntegration = {
  connected: boolean;
  id: number;
  name: string;
  toolCount: number;
};

type TemplateSummary = {
  description: string;
  id: string;
  label: string;
};

type McpToolsSidebarProps = {
  className?: string;
};

const MISSING_CONNECTION_PREFIX = "MISSING_CONNECTION:";

// The integration to connect for an automation whose attention reason is MISSING_CONNECTION:<component>.
function getMissingIntegrationId(workflow: Workflow): number | undefined {
  if (!workflow.attentionReason?.startsWith(MISSING_CONNECTION_PREFIX)) {
    return undefined;
  }

  const componentName = workflow.attentionReason.substring(MISSING_CONNECTION_PREFIX.length);

  const component = workflow.components?.find((workflowComponent) => workflowComponent.name === componentName);

  return component?.integrationId ?? undefined;
}

type IntegrationToolRow = {
  description?: string;
  enabled: boolean;
  key: string;
  label: string;
  mcpToolId?: number;
  workflowUuid?: string;
};

function getIntegrationToolRows(details: IntegrationDetails | undefined): IntegrationToolRow[] {
  const instance = details?.integrationInstances?.[0];

  if (!details || !instance) {
    return [];
  }

  const componentTools = (details.mcpTools ?? []).map((mcpTool) => ({
    description: mcpTool.description,
    enabled: instance.mcpTools?.find((instanceTool) => instanceTool.mcpToolId === mcpTool.id)?.enabled ?? false,
    key: `tool:${instance.id}:${mcpTool.id}`,
    label: mcpTool.label ?? mcpTool.name,
    mcpToolId: mcpTool.id,
  }));

  const workflowTools = (details.mcpWorkflows ?? []).map((mcpWorkflow) => ({
    description: mcpWorkflow.description,
    enabled:
      instance.mcpWorkflows?.find((instanceWorkflow) => instanceWorkflow.workflowUuid === mcpWorkflow.workflowUuid)
        ?.enabled ?? false,
    key: `workflow:${instance.id}:${mcpWorkflow.workflowUuid}`,
    label: mcpWorkflow.label ?? mcpWorkflow.workflowUuid,
    workflowUuid: mcpWorkflow.workflowUuid,
  }));

  return [...componentTools, ...workflowTools].sort((first, second) => first.label.localeCompare(second.label));
}

function getEditableTemplateId(workflow: Workflow): string | undefined {
  return workflow.kind === "REFERENCE" && workflow.automationUuid ? workflow.automationUuid : undefined;
}

function Section({ children, count, icon, title }: { children: ReactNode; count?: number; icon: ReactNode; title: string }) {
  return (
    <section className="border-b border-gray-200 px-2 py-3 last:border-b-0">
      <div className="flex items-center gap-2 px-2 pb-2">
        {icon}

        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600">{title}</h3>

        {count !== undefined && (
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">{count}</span>
        )}
      </div>

      {children}
    </section>
  );
}

export function McpToolsSidebar({ className }: McpToolsSidebarProps) {
  const [activatingTemplateId, setActivatingTemplateId] = useState<string | null>(null);
  const [connectingIntegrationId, setConnectingIntegrationId] = useState<string | null>(null);
  const [deactivatingTemplateId, setDeactivatingTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [integrationDetails, setIntegrationDetails] = useState<Record<number, IntegrationDetails>>({});
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<AutomationProject[]>([]);
  const [togglingWorkflowUuid, setTogglingWorkflowUuid] = useState<string | null>(null);
  const [togglingToolKey, setTogglingToolKey] = useState<string | null>(null);
  const [tools, setTools] = useState<McpToolSummary[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);

  const loadTools = useCallback(async () => {
    const response = await fetch("/api/chat-mcp/tools", { cache: "no-store" });
    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error ?? `Request failed with status ${response.status}`);
    }

    setTools(body.tools ?? []);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [loadedWorkflows, loadedProjects, loadedIntegrations, token] = await Promise.all([
        fetchWorkflows(),
        fetchAutomationProjects(),
        fetchIntegrations(),
        getToken(),
        loadTools(),
      ]);

      setWorkflows(loadedWorkflows);
      setProjects(loadedProjects);
      setIntegrations(loadedIntegrations);
      setJwtToken(token);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, [loadTools]);

  // Automations an MCP server offers to the user; the server reports null for the rest.
  const agentAutomations = useMemo(
    () => workflows.filter((workflow) => workflow.mcpEnabled !== null && workflow.mcpEnabled !== undefined),
    [workflows]
  );

  // Templates the user has not activated yet. Once activated, any the admin offers on the MCP server become tools.
  const templatesToActivate = useMemo<TemplateSummary[]>(() => {
    const activatedUuids = new Set(
      workflows.flatMap((workflow) => [workflow.automationUuid, workflow.copiedFromWorkflowUuid]).filter(Boolean)
    );

    return projects
      .flatMap((project) => project.workflowTemplates)
      .filter((template) => !activatedUuids.has(template.id))
      .map((template) => ({ description: template.description, id: template.id, label: template.label }));
  }, [projects, workflows]);

  // The integrations whose tools this MCP server lists, so the section follows what the admin attaches to the server.
  const toolIntegrations = useMemo<ToolIntegration[]>(() => {
    const toolCounts = new Map<number, number>();

    for (const integrationId of Object.keys(integrationDetails)) {
      toolCounts.set(Number(integrationId), 0);
    }

    for (const tool of tools) {
      if (tool.integrationId !== undefined) {
        toolCounts.set(tool.integrationId, (toolCounts.get(tool.integrationId) ?? 0) + 1);
      }
    }

    return [...toolCounts.entries()]
      .map(([integrationId, toolCount]) => {
        const integration = integrations.find((candidate) => candidate.id === integrationId);

        return {
          connected: (integration?.integrationInstances?.length ?? 0) > 0,
          id: integrationId,
          name: integration?.name ?? `Integration ${integrationId}`,
          toolCount,
        };
      })
      .sort((first, second) => first.name.localeCompare(second.name));
  }, [integrationDetails, integrations, tools]);

  const handleToggleMcp = useCallback(
    async (workflowUuid: string, enable: boolean) => {
      setTogglingWorkflowUuid(workflowUuid);
      setError(null);

      try {
        await enableMcpWorkflow(workflowUuid, enable);

        const [loadedWorkflows] = await Promise.all([fetchWorkflows(), loadTools()]);

        setWorkflows(loadedWorkflows);
      } catch (toggleError) {
        setError(
          `Could not change the automation: ${toggleError instanceof Error ? toggleError.message : String(toggleError)}`
        );
      } finally {
        setTogglingWorkflowUuid(null);
      }
    },
    [loadTools]
  );

  const handleDeactivate = useCallback(
    async (templateId: string, label: string | undefined) => {
      if (!window.confirm(`Deactivate "${label ?? "this automation"}"? Its connections and inputs are removed.`)) {
        return;
      }

      setDeactivatingTemplateId(templateId);
      setError(null);

      try {
        const response = await deprovisionWorkflowReference(templateId);

        if (!response.ok) {
          throw new Error(`the server answered ${response.status}`);
        }

        const [loadedWorkflows] = await Promise.all([fetchWorkflows(), loadTools()]);

        setWorkflows(loadedWorkflows);
      } catch (deactivateError) {
        setError(
          `Could not deactivate the automation: ${
            deactivateError instanceof Error ? deactivateError.message : String(deactivateError)
          }`
        );
      } finally {
        setDeactivatingTemplateId(null);
      }
    },
    [loadTools]
  );

  const loadIntegrationDetails = useCallback(async (integrationIds: number[]) => {
    const loadedDetails = await Promise.all(integrationIds.map((integrationId) => fetchIntegration(integrationId)));

    setIntegrationDetails(Object.fromEntries(loadedDetails.map((details) => [details.id, details])));
  }, []);

  const handleToggleIntegrationTool = useCallback(
    async (integrationId: number, integrationInstanceId: number, tool: IntegrationToolRow, enable: boolean) => {
      setTogglingToolKey(tool.key);
      setError(null);

      try {
        if (tool.workflowUuid !== undefined) {
          await enableMcpIntegrationWorkflow(integrationInstanceId, tool.workflowUuid, enable);
        } else {
          await enableMcpIntegrationTool(integrationInstanceId, tool.mcpToolId!, enable);
        }

        const [details] = await Promise.all([fetchIntegration(integrationId), loadTools()]);

        setIntegrationDetails((previous) => ({ ...previous, [integrationId]: details }));
      } catch (toggleError) {
        setError(
          `Could not change the tool: ${toggleError instanceof Error ? toggleError.message : String(toggleError)}`
        );
      } finally {
        setTogglingToolKey(null);
      }
    },
    [loadTools]
  );

  const toolIntegrationIdsKey = toolIntegrations.map((toolIntegration) => toolIntegration.id).join(",");

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!toolIntegrationIdsKey) {
      return;
    }

    loadIntegrationDetails(toolIntegrationIdsKey.split(",").map(Number)).catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    });
  }, [loadIntegrationDetails, toolIntegrationIdsKey]);

  return (
    <aside
      aria-label="MCP tools"
      className={cn("flex min-h-0 flex-col border-l border-gray-200 bg-gray-50", className)}
    >
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Agent tools</h2>

        <button
          aria-label="Refresh"
          className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-50"
          disabled={loading}
          onClick={() => void loadAll()}
          title="Refresh"
          type="button"
        >
          <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && (
          <p className="px-4 py-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {loading && tools.length === 0 && workflows.length === 0 ? (
          <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500">
            <Loader2Icon className="size-4 animate-spin" />
            Loading
          </div>
        ) : (
          <>
            <Section
              count={agentAutomations.length}
              icon={<BotIcon className="size-4 text-gray-500" />}
              title="Automations"
            >
              {agentAutomations.length === 0 && (
                <p className="px-2 pb-2 text-xs text-gray-500">
                  None of your automations are offered to AI agents yet. Activate one below.
                </p>
              )}

              <ul className="space-y-1">
                {agentAutomations.map((workflow) => {
                  const missingIntegrationId = getMissingIntegrationId(workflow);
                  const editableTemplateId = getEditableTemplateId(workflow);

                  return (
                    <li className="rounded-md px-2 py-2 hover:bg-white" key={workflow.workflowUuid}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1">
                          <p className="truncate text-sm font-medium text-gray-900" title={workflow.label}>
                            {workflow.label}
                          </p>

                          {workflow.toolOnly && (
                            <TooltipProvider delay={0}>
                              <Tooltip>
                                <TooltipTrigger
                                  aria-label="Runs only when an agent calls it"
                                  className="shrink-0 text-gray-400 hover:text-gray-600"
                                >
                                  <InfoIcon className="size-3.5" />
                                </TooltipTrigger>

                                <TooltipContent>Runs only when an agent calls it</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {editableTemplateId !== undefined && (
                            <Button
                              aria-label={`Edit ${workflow.label}`}
                              className="size-7 text-gray-500 hover:text-gray-900"
                              disabled={!jwtToken}
                              onClick={() => setActivatingTemplateId(editableTemplateId)}
                              size="icon"
                              title="Edit"
                              variant="ghost"
                            >
                              <PencilIcon className="size-3.5" />
                            </Button>
                          )}

                          {editableTemplateId !== undefined && (
                            <Button
                              aria-label={`Deactivate ${workflow.label}`}
                              className="size-7 text-gray-500 hover:text-red-600"
                              disabled={!jwtToken || deactivatingTemplateId === editableTemplateId}
                              onClick={() => void handleDeactivate(editableTemplateId, workflow.label)}
                              size="icon"
                              title="Deactivate"
                              variant="ghost"
                            >
                              <Trash2Icon className="size-3.5" />
                            </Button>
                          )}

                          <Switch
                            aria-label={`Available to AI agents: ${workflow.label}`}
                            checked={workflow.mcpEnabled === true}
                            disabled={!workflow.workflowUuid || togglingWorkflowUuid === workflow.workflowUuid}
                            onCheckedChange={(checked) => void handleToggleMcp(workflow.workflowUuid!, checked)}
                            title="Available to AI agents"
                          />
                        </div>
                      </div>

                      {missingIntegrationId !== undefined && (
                        <div className="mt-2 flex gap-2">
                          <Button
                            className="h-7 text-xs"
                            disabled={!jwtToken}
                            onClick={() => setConnectingIntegrationId(String(missingIntegrationId))}
                            size="sm"
                            variant="outline"
                          >
                            Connect the app it needs
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {templatesToActivate.length > 0 && (
                <>
                  <p className="px-2 pb-1 pt-3 text-xs font-medium text-gray-600">Activate an automation</p>

                  <ul className="space-y-1">
                    {templatesToActivate.map((template) => (
                      <li className="flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-white" key={template.id}>
                        <p className="min-w-0 truncate text-sm text-gray-900" title={template.description || template.label}>
                          {template.label}
                        </p>

                        <Button
                          className="h-7 shrink-0 text-xs"
                          disabled={!jwtToken}
                          onClick={() => setActivatingTemplateId(template.id)}
                          size="sm"
                        >
                          Activate
                        </Button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Section>

            <Section
              count={toolIntegrations.length}
              icon={<PlugIcon className="size-4 text-gray-500" />}
              title="Integrations"
            >
              {toolIntegrations.length === 0 && (
                <p className="px-2 pb-2 text-xs text-gray-500">No integrations are offered to AI agents yet.</p>
              )}

              <ul className="space-y-1">
                {toolIntegrations.map((toolIntegration) => {
                  const details = integrationDetails[toolIntegration.id];
                  const instance = details?.integrationInstances?.[0];
                  const toolRows = getIntegrationToolRows(details);

                  return (
                    <li className="rounded-md px-2 py-2 hover:bg-white" key={toolIntegration.id}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm text-gray-900">{toolIntegration.name}</p>

                          <p className="text-xs text-gray-500">
                            {toolIntegration.toolCount} {toolIntegration.toolCount === 1 ? "tool" : "tools"}
                          </p>
                        </div>

                        <Button
                          className={cn("h-7 shrink-0 text-xs", toolIntegration.connected && "text-green-700")}
                          disabled={!jwtToken}
                          onClick={() => setConnectingIntegrationId(String(toolIntegration.id))}
                          size="sm"
                          variant="outline"
                        >
                          {toolIntegration.connected ? "Connected" : "Connect"}
                        </Button>
                      </div>

                      {instance && toolRows.length > 0 && (
                        <ul className="mt-2 space-y-1 border-l border-gray-200 pl-3">
                          {toolRows.map((toolRow) => (
                            <li className="flex items-center justify-between gap-2" key={toolRow.key}>
                              <div className="flex min-w-0 items-center gap-1">
                                <p className="truncate text-xs text-gray-800" title={toolRow.label}>
                                  {toolRow.label}
                                </p>

                                {toolRow.description && (
                                  <TooltipProvider delay={0}>
                                    <Tooltip>
                                      <TooltipTrigger
                                        aria-label={toolRow.description}
                                        className="shrink-0 text-gray-400 hover:text-gray-600"
                                      >
                                        <InfoIcon className="size-3" />
                                      </TooltipTrigger>

                                      <TooltipContent>{toolRow.description}</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>

                              <Switch
                                aria-label={`Available to AI agents: ${toolRow.label}`}
                                checked={toolRow.enabled}
                                disabled={togglingToolKey === toolRow.key}
                                onCheckedChange={(checked) =>
                                  void handleToggleIntegrationTool(toolIntegration.id, instance.id, toolRow, checked)
                                }
                                title="Available to AI agents"
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Section>

            <Section count={tools.length} icon={<WrenchIcon className="size-4 text-gray-500" />} title="Tools">
              {tools.length === 0 && (
                <p className="px-2 pb-2 text-xs text-gray-500">
                  No tools are available. Connect an integration or activate an automation that is offered on this
                  MCP server.
                </p>
              )}

              <ul className="space-y-1">
                {tools.map((tool) => (
                  <li className="rounded-md px-2 py-2 hover:bg-white" key={tool.name}>
                    <p className="break-all font-mono text-xs font-medium text-gray-900">{tool.title ?? tool.name}</p>

                    {tool.description && (
                      <p className="mt-1 line-clamp-3 text-xs text-gray-600" title={tool.description}>
                        {tool.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          </>
        )}
      </div>

      {activatingTemplateId && jwtToken && (
        <ActivationDialogOpener
          jwtToken={jwtToken}
          key={activatingTemplateId}
          onDone={() => {
            setActivatingTemplateId(null);

            void loadAll();
          }}
          workflowTemplateId={activatingTemplateId}
        />
      )}

      {connectingIntegrationId && jwtToken && (
        <ConnectDialogOpener
          integrationId={connectingIntegrationId}
          jwtToken={jwtToken}
          key={connectingIntegrationId}
          onDone={() => {
            setConnectingIntegrationId(null);

            void loadAll();
          }}
        />
      )}
    </aside>
  );
}
