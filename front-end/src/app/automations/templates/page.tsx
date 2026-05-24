'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AutomationWorkflowProject, copyWorkflowTemplate, fetchAutomationWorkflowProjects } from "@/lib/api";

export default function WorkflowTemplatesPage() {
  const router = useRouter();

  const [projects, setProjects] = useState<AutomationWorkflowProject[] | undefined>();
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingWorkflowId, setCreatingWorkflowId] = useState<string | null>(null);

  useEffect(() => {
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
      <div className="flex flex-col gap-4 w-full max-w-5xl">
        <div className="w-full flex items-center gap-3 py-4">
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
          <div className="flex flex-col gap-8">
            {projects!.map((project) => (
              <section key={project.id}>
                <div className="mb-3">
                  <h2 className="text-lg font-semibold">{project.name}</h2>

                  {project.description && (
                    <p className="text-sm text-muted-foreground">{project.description}</p>
                  )}
                </div>

                {project.workflowTemplates.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {project.workflowTemplates.map((workflowTemplate) => (
                      <Card
                        key={workflowTemplate.id}
                        role="button"
                        aria-disabled={creatingWorkflowId !== null}
                        onClick={() => creatingWorkflowId === null && handleSelectWorkflowTemplate(workflowTemplate.id)}
                        className="cursor-pointer transition-colors hover:bg-muted/40 aria-disabled:pointer-events-none aria-disabled:opacity-60"
                      >
                        <CardHeader>
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
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No workflow templates available in this project.</p>
                )}
              </section>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-secondary rounded-md border border-border">
            <p className="text-muted-foreground">No workflow templates available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
