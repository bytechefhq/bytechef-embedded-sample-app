'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { copyWorkflowTemplate, fetchWorkflowTemplates, WorkflowTemplate } from "@/lib/api";

export default function WorkflowTemplatesPage() {
  const router = useRouter();

  const [templates, setTemplates] = useState<WorkflowTemplate[] | undefined>();
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkflowTemplates()
      .then((data) => {
        setTemplates(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch workflow templates");
        setLoading(false);
      });
  }, []);

  const handleSelectTemplate = (templateId: string) => {
    setCreatingTemplateId(templateId);
    setError(null);

    copyWorkflowTemplate(templateId)
      .then((workflowUuid) => {
        router.push(`/automations/${workflowUuid}`);
      })
      .catch(() => {
        setError("Failed to create a workflow from the selected template");
        setCreatingTemplateId(null);
      });
  };

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
        ) : templates && templates.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card
                key={template.id}
                role="button"
                aria-disabled={creatingTemplateId !== null}
                onClick={() => creatingTemplateId === null && handleSelectTemplate(template.id)}
                className="cursor-pointer transition-colors hover:bg-muted/40 aria-disabled:pointer-events-none aria-disabled:opacity-60"
              >
                <CardHeader>
                  <CardTitle className="text-base">{template.label}</CardTitle>
                  <CardDescription>
                    {creatingTemplateId === template.id
                      ? "Creating workflow..."
                      : template.description || "No description provided"}
                  </CardDescription>

                  {template.components.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {template.components.map((component) => (
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
          <div className="text-center py-12 bg-secondary rounded-md border border-border">
            <p className="text-muted-foreground">No workflow templates available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
