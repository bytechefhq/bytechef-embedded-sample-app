'use client';

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useActivationDialog } from "@bytechef/embedded";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AutomationWorkflowProject, copyWorkflowTemplate, fetchAutomationWorkflowProjects, getToken } from "@/lib/api";
import { BYTECHEF_APP_BASE_URL, BYTECHEF_ENVIRONMENT } from "@/lib/config";

function ActivationDialogOpener({
  jwtToken,
  onDone,
  router,
  workflowTemplateId,
}: {
  jwtToken: string;
  onDone: () => void;
  router: ReturnType<typeof useRouter>;
  workflowTemplateId: string;
}) {
  // StrictMode mounts effects twice; open once, and let the hook tear the dialog down on unmount. Calling
  // closeDialog in a cleanup would fire onClose → onDone and unmount this opener before the dialog shows.
  const openedRef = useRef(false);

  const { openDialog } = useActivationDialog({
    baseUrl: BYTECHEF_APP_BASE_URL,
    environment: BYTECHEF_ENVIRONMENT,
    jwtToken,
    onActivated: () => router.push("/automations"),
    onClose: onDone,
    onEditWorkflow: (workflowUuid) => router.push(`/automations/${workflowUuid}`),
    workflowTemplateId,
  });

  useEffect(() => {
    if (openedRef.current) {
      return;
    }

    openedRef.current = true;

    openDialog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function WorkflowTemplatesPage() {
  const router = useRouter();

  const [projects, setProjects] = useState<AutomationWorkflowProject[] | undefined>();
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingWorkflowId, setCreatingWorkflowId] = useState<string | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [activatingTemplateId, setActivatingTemplateId] = useState<string | null>(null);

  useEffect(() => {
    getToken()
      .then(setJwtToken)
      .catch(() => setJwtToken(null));

    fetchAutomationWorkflowProjects()
      .then((data) => {
        setProjects(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch workflow catalog");
        setLoading(false);
      });
  }, []);

  const handleSelectWorkflowTemplate = (workflowTemplateUuid: string) => {
    setCreatingWorkflowId(workflowTemplateUuid);
    setError(null);

    copyWorkflowTemplate(workflowTemplateUuid)
      .then((workflowUuid) => {
        router.push(`/automations/${workflowUuid}`);
      })
      .catch(() => {
        setError("Failed to create a workflow from the selected template");
        setCreatingWorkflowId(null);
      });
  };

  const hasWorkflowTemplates = projects && projects.some((project) => project.workflowTemplates.length > 0);

  return (
    <div className="flex justify-center w-full">
      <div className="flex flex-col gap-4 w-full">
        <div className="w-full flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/automations")}
            aria-label="Back to workflows"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>

          <h1 className="text-xl font-semibold">Choose a workflow template</h1>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md" role="alert">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading...</div>
        ) : hasWorkflowTemplates ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {projects!.flatMap((project) =>
              project.workflowTemplates.map((workflowTemplate) => (
                <Card
                  key={workflowTemplate.id}
                  role="button"
                  aria-disabled={creatingWorkflowId !== null}
                  onClick={() => creatingWorkflowId === null && handleSelectWorkflowTemplate(workflowTemplate.id)}
                  className="flex h-full cursor-pointer flex-col transition-colors hover:bg-muted/40 aria-disabled:pointer-events-none aria-disabled:opacity-60"
                >
                  <CardHeader className="flex flex-1 flex-col">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{project.name}</p>

                    <CardTitle className="text-base">{workflowTemplate.label}</CardTitle>

                    <CardDescription>
                      {creatingWorkflowId === workflowTemplate.id
                        ? "Creating workflow..."
                        : workflowTemplate.description || "No description provided"}
                    </CardDescription>

                    {workflowTemplate.components.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        {workflowTemplate.components.map((component) => (
                          <span
                            key={component.name}
                            title={component.title || component.name}
                            className="flex size-9 items-center justify-center rounded-full border border-border bg-background p-1.5"
                          >
                            {component.icon && (
                              <img
                                src={`data:image/svg+xml;utf8,${encodeURIComponent(component.icon)}`}
                                alt={component.title || component.name}
                                className="size-full"
                              />
                            )}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto pt-3">
                      <Button
                        size="sm"
                        disabled={!jwtToken}
                        onClick={(event) => {
                          event.stopPropagation();
                          setActivatingTemplateId(workflowTemplate.id);
                        }}
                      >
                        Activate
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="text-center py-12 bg-secondary rounded-md border border-border">
            <p className="text-muted-foreground">No workflow templates available.</p>
          </div>
        )}

        {activatingTemplateId && jwtToken && (
          <ActivationDialogOpener
            key={activatingTemplateId}
            jwtToken={jwtToken}
            onDone={() => setActivatingTemplateId(null)}
            router={router}
            workflowTemplateId={activatingTemplateId}
          />
        )}
      </div>
    </div>
  );
}
