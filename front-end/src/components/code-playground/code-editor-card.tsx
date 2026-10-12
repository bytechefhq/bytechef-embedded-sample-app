"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2Icon, RotateCcwIcon, UploadIcon } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";

const INDENT = "    ";

interface CodeEditorCardProps {
  children?: ReactNode;
  deploying: boolean;
  description: ReactNode;
  fileName: string;
  onDeploy: () => void;
  onFileNameChange: (fileName: string) => void;
  onReset: () => void;
  onSourceChange: (source: string) => void;
  source: string;
  title: string;
}

export function CodeEditorCard({
  children,
  deploying,
  description,
  fileName,
  onDeploy,
  onFileNameChange,
  onReset,
  onSourceChange,
  source,
  title,
}: CodeEditorCardProps) {
  // Tab indents instead of moving focus, so the textarea behaves like a minimal code editor.
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Tab" || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    event.preventDefault();

    const textarea = event.currentTarget;
    const { selectionEnd, selectionStart } = textarea;

    onSourceChange(source.slice(0, selectionStart) + INDENT + source.slice(selectionEnd));

    requestAnimationFrame(() => {
      textarea.selectionStart = selectionStart + INDENT.length;
      textarea.selectionEnd = selectionStart + INDENT.length;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>

        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <Textarea
          aria-label="Source"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className="font-mono text-sm leading-relaxed"
          onChange={(event) => onSourceChange(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={26}
          spellCheck={false}
          value={source}
        />

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex min-w-64 flex-1 flex-col gap-2">
            <Label htmlFor="codeFileName">File name</Label>

            <div className="flex items-center gap-2">
              <Input
                className="font-mono"
                id="codeFileName"
                onChange={(event) => onFileNameChange(event.target.value)}
                value={fileName}
              />

              <span className="font-mono text-sm text-muted-foreground">.js</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button disabled={deploying} onClick={onReset} type="button" variant="outline">
              <RotateCcwIcon className="mr-2 size-4" />
              Reset to Starter
            </Button>

            <Button disabled={deploying || !source.trim()} onClick={onDeploy} type="button">
              {deploying ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : <UploadIcon className="mr-2 size-4" />}
              Deploy
            </Button>
          </div>
        </div>

        {children}
      </CardContent>
    </Card>
  );
}
