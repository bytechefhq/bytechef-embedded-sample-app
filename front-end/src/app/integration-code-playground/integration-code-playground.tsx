"use client";

import { CodeEditorCard } from "@/components/code-playground/code-editor-card";
import { errorMessage, readSourceProperty } from "@/components/code-playground/response-text";
import { integrationStarterFileName, integrationStarterSource } from "@/components/code-playground/starters";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowRightIcon, RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ReactSVG from "react-inlinesvg";

interface IntegrationI {
  componentName?: string;
  description?: string;
  icon?: string;
  id?: number;
  integrationInstances?: unknown[];
  integrationVersion?: number;
  name?: string;
  title?: string;
}

export function IntegrationCodePlayground() {
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deploySucceeded, setDeploySucceeded] = useState(false);
  const [deployedComponentName, setDeployedComponentName] = useState<string | undefined>(
    readSourceProperty(integrationStarterSource, "componentName")
  );
  const [deploying, setDeploying] = useState(false);
  const [fileName, setFileName] = useState(integrationStarterFileName);
  const [integrations, setIntegrations] = useState<IntegrationI[]>([]);
  const [integrationsError, setIntegrationsError] = useState<string | null>(null);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [source, setSource] = useState(integrationStarterSource);

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

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

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

  const deployedIntegrationFound = integrations.some(
    (integration) => deployedComponentName && integration.componentName === deployedComponentName
  );

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
            away. ByteChef refuses that when the component needs OAuth app credentials an administrator has to supply
            first.
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
                const deployed = Boolean(deployedComponentName) && integration.componentName === deployedComponentName;

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
    </div>
  );
}
