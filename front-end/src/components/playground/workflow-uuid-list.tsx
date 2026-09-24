import { Button } from "@/components/ui/button";
import { CheckIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface WorkflowUuidItemI {
  label?: string;
  workflowUuid: string;
}

interface WorkflowUuidListProps {
  onSelect: (workflowUuid: string) => void;
  renderActions?: (workflow: WorkflowUuidItemI) => ReactNode;
  selectedWorkflowUuid: string;
  workflows: WorkflowUuidItemI[];
}

export function WorkflowUuidList({ onSelect, renderActions, selectedWorkflowUuid, workflows }: WorkflowUuidListProps) {
  return (
    <ul className="divide-y rounded-md border">
      {workflows.map((workflow) => {
        const selected = workflow.workflowUuid === selectedWorkflowUuid;

        return (
          <li className="flex items-center justify-between gap-4 px-4 py-2" key={workflow.workflowUuid}>
            <div className="flex min-w-0 flex-col">
              <span className="text-sm font-medium">{workflow.label || "Untitled"}</span>

              <span className="truncate font-mono text-xs text-muted-foreground">{workflow.workflowUuid}</span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {renderActions?.(workflow)}

              <Button
                disabled={selected}
                onClick={() => onSelect(workflow.workflowUuid)}
                size="sm"
                type="button"
                variant="outline"
              >
                {selected && <CheckIcon className="mr-2 size-4" />}
                {selected ? "Selected" : "Use"}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
