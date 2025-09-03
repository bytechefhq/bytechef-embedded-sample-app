'use client';

import { useEffect, useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import CreateWorkflowDialog from "./components/create-workflow-dialog";
import { Button } from "@/components/ui/button";
import {Switch} from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { fetchWorkflows, enableWorkflow, deleteWorkflow, Workflow } from "@/lib/api";

export default function AutomationsPage() {
  const [workflows, setWorkflows] = useState<Workflow[] | undefined>();
  const [isLoading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchWorkflowsData = () => {
    setLoading(true);
    fetchWorkflows()
      .then((data) => {
        setWorkflows(data);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to fetch workflows");
        setLoading(false);
      });
  };

  const toggleWorkflowEnabled = (workflowUuid: string, enable: boolean) => {
    setLoading(true);
    enableWorkflow(workflowUuid, enable)
      .then(() => {
        setLoading(false);
        fetchWorkflowsData();
      })
      .catch((err) => {
        setError("Failed to enable workflow workflowUuid: " + workflowUuid + ": " + err.message);
        setLoading(false);
      });
  };

  const handleDeleteWorkflow = (workflowUuid: string) => {
    if (!confirm("Are you sure you want to delete this workflow? This action cannot be undone.")) {
      return;
    }

    setLoading(true);
    deleteWorkflow(workflowUuid)
      .then((res) => {
        if (res.ok) {
          setSuccess("Workflow deleted successfully!");
          fetchWorkflows().then((data) => {
            setWorkflows(data);
            setLoading(false);
          });
        } else {
          throw new Error("Failed to delete workflow");
        }
      })
      .catch((err) => {
        setError("Failed to delete workflow: " + err.message);
        setLoading(false);
      });
  };

  const handleWorkflowCreated = () => {
    setSuccess("Workflow created successfully!");
    fetchWorkflowsData(); // Refresh the list
  };

  useEffect(() => {
    fetchWorkflowsData();
  }, []);

  if (isLoading) {
    return <div className="flex justify-center w-full">
      <div className="flex flex-col gap-4 w-full max-w-5xl">
        <div className="w-full flex justify-between items-center py-4">
          Loading...
        </div>
      </div>
    </div>;
  }

  return (
    <div className="flex justify-center w-full">
      <div className="flex flex-col gap-4 w-full max-w-5xl">
        <div className="w-full flex justify-between items-center py-4">
          <h1 className="text-xl font-semibold">Workflows</h1>

          <Button onClick={() => setIsDialogOpen(true)}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Workflow
          </Button>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md relative mb-4" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-md relative mb-4" role="alert">
            {success}
          </div>
        )}

        <div className="flex-1">
          {workflows && workflows.length > 0 ? (
            <ul role="list" className="divide-y divide-gray-100 overflow-hidden bg-white shadow-xs ring-1 ring-gray-900/5 sm:rounded-xl">
              {workflows.map((workflow) => (
                <li key={workflow.workflowUuid} className="relative flex justify-between gap-x-6 px-6 py-5 hover:bg-muted/40">
                  <div className="flex min-w-0 gap-x-4">
                    <div className="min-w-0 flex-auto">
                      <div className="text-sm font-semibold text-foreground">
                        <a href={`/automations/${workflow.workflowUuid}`}>
                          <span className="absolute inset-x-0 -top-px bottom-0 right-32" />
                          {workflow.label}
                          <Badge variant="outline" className="ml-2 text-xs font-normal">
                            {workflow.workflowVersion ? `V${workflow.workflowVersion}` : 'DRAFT'}
                          </Badge>
                        </a>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {workflow.description || "No description provided"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-x-4">
                    <div className="hidden sm:flex sm:flex-col sm:items-end">
                      <p className="text-sm text-muted-foreground">
                        {workflow.workflowUuid || "No reference code"}
                      </p>
                    </div>

                    <Switch disabled={!workflow.workflowVersion} checked={workflow.enabled} onCheckedChange={() => toggleWorkflowEnabled(workflow.workflowUuid!, !workflow.enabled)} />

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteWorkflow(workflow.workflowUuid!);
                      }}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title="Delete workflow"
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
              <div className="text-center py-12 bg-secondary rounded-md border border-border">
                <p className="text-muted-foreground">No workflows found. Create your first workflow!</p>
            </div>
          )}
        </div>

        <CreateWorkflowDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onWorkflowCreated={handleWorkflowCreated}
        />
      </div>
    </div>
  );
}
