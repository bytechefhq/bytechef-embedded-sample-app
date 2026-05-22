'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AutomationWorkflowProject, copyWorkflow, fetchAutomationWorkflowProjects } from "@/lib/api";

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

  const handleSelectWorkflow = (workflowId: string) => {
    setCreatingWorkflowId(workflowId);
    setError(null);

    copyWorkflow(workflowId)
      .then((workflowUuid) => {
        router.push(`/automations/${workflowUuid}`);
      })
      .catch(() => {
        setError("Failed to create a workflow from the selected template");
        setCreatingWorkflowId(null);
      });
  };

  const hasWorkflows = projects && projects.some((project) => project.workflows.length > 0);

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
        ) : hasWorkflows ? (
          <div className="flex flex-col gap-8">
            {projects!.map((project) => (
              <section key={project.id}>
                <div className="mb-3">
                  <h2 className="text-lg font-semibold">{project.name}</h2>

                  {project.description && (
                    <p className="text-sm text-muted-foreground">{project.description}</p>
                  )}
                </div>

                {project.workflows.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {project.workflows.map((workflow) => (
                      <Card
                        key={workflow.id}
                        role="button"
                        aria-disabled={creatingWorkflowId !== null}
                        onClick={() => creatingWorkflowId === null && handleSelectWorkflow(workflow.id)}
                        className="cursor-pointer transition-colors hover:bg-muted/40 aria-disabled:pointer-events-none aria-disabled:opacity-60"
                      >
                        <CardHeader>
                          <CardTitle className="text-base">{workflow.label}</CardTitle>

                          <CardDescription>
                            {creatingWorkflowId === workflow.id
                              ? "Creating workflow..."
                              : workflow.description || "No description provided"}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No workflows available in this project.</p>
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
