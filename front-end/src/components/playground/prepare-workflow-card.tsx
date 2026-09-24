"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckIcon, ChevronDownIcon, CopyIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

interface PrepareWorkflowCardProps {
  description: ReactNode;
  sampleWorkflowJson: string;
  steps: ReactNode;
  title: string;
}

export function PrepareWorkflowCard({ description, sampleWorkflowJson, steps, title }: PrepareWorkflowCardProps) {
  const [copied, setCopied] = useState(false);

  const copySampleWorkflow = async () => {
    await navigator.clipboard.writeText(sampleWorkflowJson);

    setCopied(true);

    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Collapsible defaultOpen render={<Card />}>
      <CardHeader>
        <CardTitle>
          <CollapsibleTrigger className="group flex w-full items-center justify-between gap-4 text-left">
            {title}
            <ChevronDownIcon className="size-5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180" />
          </CollapsibleTrigger>
        </CardTitle>

        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CollapsibleContent>
        <CardContent className="flex flex-col gap-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm">{steps}</ol>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="sampleWorkflow">Sample workflow</Label>

              <Button onClick={copySampleWorkflow} size="sm" type="button" variant="outline">
                {copied ? <CheckIcon className="mr-2 size-4" /> : <CopyIcon className="mr-2 size-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>

            <Textarea className="font-mono text-sm" id="sampleWorkflow" readOnly rows={16} value={sampleWorkflowJson} />
          </div>
        </CardContent>
      </CollapsibleContent>
    </Collapsible>
  );
}
