"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { BotIcon, Loader2Icon, PlugIcon, RefreshCwIcon, WrenchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  type AutomationProject,
  enableMcpWorkflow,
  fetchAutomationProjects,
  fetchIntegrations,
  fetchWorkflows,
  getToken,
  type Integration,
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
  const [error, setError] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<AutomationProject[]>([]);
  const [togglingWorkflowUuid, setTogglingWorkflowUuid] = useState<string | null>(null);
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
  }, [integrations, tools]);

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

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

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

                  return (
                    <li className="rounded-md px-2 py-2 hover:bg-white" key={workflow.workflowUuid}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900" title={workflow.label}>
                            {workflow.label}
                          </p>

                          {workflow.toolOnly && (
                            <span className="mt-1 inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                              Runs only when an agent calls it
                            </span>
                          )}
                        </div>

                        <Switch
                          aria-label={`Available to AI agents: ${workflow.label}`}
                          checked={workflow.mcpEnabled === true}
                          disabled={!workflow.workflowUuid || togglingWorkflowUuid === workflow.workflowUuid}
                          onCheckedChange={(checked) => void handleToggleMcp(workflow.workflowUuid!, checked)}
                          title="Available to AI agents"
                        />
                      </div>

                      {missingIntegrationId !== undefined && (
                        <Button
                          className="mt-2 h-7 text-xs"
                          disabled={!jwtToken}
                          onClick={() => setConnectingIntegrationId(String(missingIntegrationId))}
                          size="sm"
                          variant="outline"
                        >
                          Connect the app it needs
                        </Button>
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
                {toolIntegrations.map((toolIntegration) => (
                  <li
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-white"
                    key={toolIntegration.id}
                  >
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
                  </li>
                ))}
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
