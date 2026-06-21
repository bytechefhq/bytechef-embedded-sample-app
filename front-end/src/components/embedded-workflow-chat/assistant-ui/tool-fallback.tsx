"use client";

import * as Collapsible from '@radix-ui/react-collapsible';
import {type ToolCallMessagePartComponent, type ToolCallMessagePartStatus, useScrollLock} from '@assistant-ui/react';
import {AlertCircleIcon, CheckIcon, ChevronDownIcon, LoaderIcon, XCircleIcon} from 'lucide-react';
import {memo, useCallback, useRef, useState} from 'react';
import {twMerge} from 'tailwind-merge';

const ANIMATION_DURATION = 200;

type ToolStatus = ToolCallMessagePartStatus['type'];

const statusIconMap: Record<ToolStatus, React.ElementType> = {
    complete: CheckIcon,
    incomplete: XCircleIcon,
    'requires-action': AlertCircleIcon,
    running: LoaderIcon,
};

function ToolFallbackRoot({
    children,
    className,
    defaultOpen = false,
    onOpenChange: controlledOnOpenChange,
    open: controlledOpen,
    ...props
}: Omit<React.ComponentProps<typeof Collapsible.Root>, 'open' | 'onOpenChange'> & {
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    open?: boolean;
}) {
    const collapsibleRef = useRef<HTMLDivElement>(null);
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
    const lockScroll = useScrollLock(collapsibleRef, ANIMATION_DURATION);

    const isControlled = controlledOpen !== undefined;
    const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

    const handleOpenChange = useCallback(
        (open: boolean) => {
            if (!open) {
                lockScroll();
            }

            if (!isControlled) {
                setUncontrolledOpen(open);
            }

            controlledOnOpenChange?.(open);
        },
        [lockScroll, isControlled, controlledOnOpenChange]
    );

    return (
        <Collapsible.Root
            ref={collapsibleRef}
            data-slot="tool-fallback-root"
            open={isOpen}
            onOpenChange={handleOpenChange}
            className={twMerge(
                'aui-tool-fallback-root group/tool-fallback-root w-full rounded-lg border py-3',
                className
            )}
            style={{'--animation-duration': `${ANIMATION_DURATION}ms`} as React.CSSProperties}
            {...props}
        >
            {children}
        </Collapsible.Root>
    );
}

function ToolFallbackTrigger({
    className,
    status,
    toolName,
    ...props
}: React.ComponentProps<typeof Collapsible.Trigger> & {
    status?: ToolCallMessagePartStatus;
    toolName: string;
}) {
    const statusType = status?.type ?? 'complete';
    const isRunning = statusType === 'running';
    const isCancelled = status?.type === 'incomplete' && status.reason === 'cancelled';

    const Icon = statusIconMap[statusType];
    const label = isCancelled ? 'Cancelled tool' : 'Used tool';

    return (
        <Collapsible.Trigger
            data-slot="tool-fallback-trigger"
            className={twMerge(
                'aui-tool-fallback-trigger group/trigger flex w-full items-center gap-2 px-4 text-sm transition-colors',
                className
            )}
            {...props}
        >
            <Icon
                className={twMerge(
                    'aui-tool-fallback-trigger-icon size-4 shrink-0',
                    isCancelled && 'text-muted-foreground',
                    isRunning && 'animate-spin'
                )}
            />

            <span
                className={twMerge(
                    'aui-tool-fallback-trigger-label-wrapper relative inline-block grow text-start leading-none',
                    isCancelled && 'text-muted-foreground line-through'
                )}
            >
                <span>
                    {label}: <b>{toolName}</b>
                </span>

                {isRunning && (
                    <span aria-hidden className="shimmer pointer-events-none absolute inset-0 motion-reduce:animate-none">
                        {label}: <b>{toolName}</b>
                    </span>
                )}
            </span>

            <ChevronDownIcon
                className={twMerge(
                    'aui-tool-fallback-trigger-chevron size-4 shrink-0',
                    'transition-transform duration-(--animation-duration) ease-out',
                    'group-data-[state=closed]/trigger:-rotate-90',
                    'group-data-[state=open]/trigger:rotate-0'
                )}
            />
        </Collapsible.Trigger>
    );
}

function ToolFallbackContent({children, className, ...props}: React.ComponentProps<typeof Collapsible.Content>) {
    return (
        <Collapsible.Content
            className={twMerge(
                'aui-tool-fallback-content relative overflow-hidden text-sm outline-none',
                'data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
                'data-[state=closed]:fill-mode-forwards data-[state=closed]:pointer-events-none',
                'data-[state=open]:duration-(--animation-duration) data-[state=closed]:duration-(--animation-duration)',
                className
            )}
            {...props}
        >
            <div className="mt-3 flex flex-col gap-2 border-t pt-2">{children}</div>
        </Collapsible.Content>
    );
}

const ToolFallbackImpl: ToolCallMessagePartComponent = ({argsText, result, status, toolName}) => {
    const isCancelled = status?.type === 'incomplete' && status.reason === 'cancelled';

    return (
        <ToolFallbackRoot className={twMerge(isCancelled && 'border-muted-foreground/30 bg-muted/30')}>
            <ToolFallbackTrigger status={status} toolName={toolName} />

            <ToolFallbackContent>
                {status?.type === 'incomplete' && (() => {
                    const error = status.error;
                    const errorText = error ? (typeof error === 'string' ? error : JSON.stringify(error)) : null;

                    if (!errorText) {
                        return null;
                    }

                    const headerText = status.reason === 'cancelled' ? 'Cancelled reason:' : 'Error:';

                    return (
                        <div className="aui-tool-fallback-error px-4">
                            <p className="text-muted-foreground font-semibold">{headerText}</p>
                            <p className="text-muted-foreground">{errorText}</p>
                        </div>
                    );
                })()}

                {argsText && (
                    <div className={twMerge('aui-tool-fallback-args px-4', isCancelled && 'opacity-60')}>
                        <pre className="whitespace-pre-wrap">{argsText}</pre>
                    </div>
                )}

                {!isCancelled && result !== undefined && (
                    <div className="aui-tool-fallback-result border-t border-dashed px-4 pt-2">
                        <p className="font-semibold">Result:</p>
                        <pre className="whitespace-pre-wrap">
                            {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
                        </pre>
                    </div>
                )}
            </ToolFallbackContent>
        </ToolFallbackRoot>
    );
};

export const ToolFallback = memo(ToolFallbackImpl) as unknown as ToolCallMessagePartComponent;

ToolFallback.displayName = 'ToolFallback';
