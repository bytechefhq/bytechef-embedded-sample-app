"use client";

import {type ToolCallMessagePartComponent} from '@assistant-ui/react';
import {AlertCircleIcon, CheckCircle2Icon, ChevronDownIcon, ChevronRightIcon, Loader2Icon, WrenchIcon} from 'lucide-react';
import {memo, useState} from 'react';

type ToolStatus = 'error' | 'running' | 'success';

const StatusIcon = ({status}: {status: ToolStatus}) => {
    if (status === 'running') {
        return <Loader2Icon className="size-4 animate-spin text-muted-foreground" />;
    }

    if (status === 'error') {
        return <AlertCircleIcon className="size-4 text-red-500" />;
    }

    return <CheckCircle2Icon className="size-4 text-emerald-600" />;
};

const truncate = (value: string, maxLength: number): string =>
    value.length <= maxLength ? value : `${value.slice(0, maxLength).trimEnd()}…`;

/**
 * Compact `key: value, …` preview shown inline next to the tool name, mirroring AI Hub's tool card header.
 */
const summarizeArgs = (args: Record<string, unknown> | undefined): string => {
    if (!args) {
        return '';
    }

    const entries = Object.entries(args);

    if (entries.length === 0) {
        return '';
    }

    const summary = entries
        .map(([key, value]) => {
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

            return `${key}: ${truncate(stringValue ?? '', 40)}`;
        })
        .join(', ');

    return truncate(summary, 80);
};

const JsonViewer = ({label, value}: {label: string; value: unknown}) => {
    if (value === undefined || value === null) {
        return null;
    }

    const display = typeof value === 'string' ? value : JSON.stringify(value, null, 2);

    return (
        <div className="mt-2 first:mt-0">
            <div className="mb-1 text-xs font-semibold text-muted-foreground">{label}</div>

            <pre className="max-h-60 overflow-auto rounded-md bg-muted px-2 py-1.5 text-xs leading-snug whitespace-pre-wrap">
                {display}
            </pre>
        </div>
    );
};

/**
 * Tool-call card matching AI Hub's AiHubToolCallRenderer: a collapsible row with a `toolName — args preview`
 * header, a status icon (running / error / success), and Input/Result sections when expanded. AG-UI doesn't
 * supply an explicit error flag, so an error is inferred from an `{error: "…"}` result envelope (the shape
 * returned by validation failures such as askUserQuestion's chip-length guard).
 */
const ToolFallbackImpl: ToolCallMessagePartComponent = ({args, argsText, isError, result, toolName}) => {
    const [expanded, setExpanded] = useState(false);

    const argsObject = args && typeof args === 'object' ? (args as Record<string, unknown>) : undefined;
    const argsSummary = argsObject ? summarizeArgs(argsObject) : argsText ? truncate(argsText, 80) : '';

    const resultHasError =
        result != null && typeof result === 'object' && typeof (result as {error?: unknown}).error === 'string';

    const status: ToolStatus = result === undefined ? 'running' : isError || resultHasError ? 'error' : 'success';

    const inputValue = argsObject && Object.keys(argsObject).length > 0 ? argsObject : argsText || undefined;

    return (
        <div className="my-2 flex w-full flex-col rounded-lg border border-border bg-muted/30 text-sm">
            <button
                aria-expanded={expanded}
                className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-accent/50"
                onClick={() => setExpanded((previous) => !previous)}
                type="button"
            >
                {expanded ? (
                    <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
                ) : (
                    <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
                )}

                <div className="flex min-w-0 flex-1 items-center gap-2">
                    <WrenchIcon className="size-4 shrink-0 text-muted-foreground" />

                    <span className="truncate font-medium text-foreground">{toolName}</span>

                    {argsSummary && <span className="truncate text-xs text-muted-foreground">— {argsSummary}</span>}

                    <span className="ml-auto flex items-center">
                        <StatusIcon status={status} />
                    </span>
                </div>
            </button>

            {expanded && (
                <div className="border-t border-border px-3 py-2">
                    <JsonViewer label="Input" value={inputValue} />

                    <JsonViewer label="Result" value={result} />

                    {inputValue === undefined && result === undefined && (
                        <div className="text-xs text-muted-foreground italic">No input or result.</div>
                    )}
                </div>
            )}
        </div>
    );
};

export const ToolFallback = memo(ToolFallbackImpl) as unknown as ToolCallMessagePartComponent;

ToolFallback.displayName = 'ToolFallback';
