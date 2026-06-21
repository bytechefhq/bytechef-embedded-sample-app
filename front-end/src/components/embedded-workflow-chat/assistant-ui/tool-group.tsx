"use client";

import * as Collapsible from '@radix-ui/react-collapsible';
import {useScrollLock} from '@assistant-ui/react';
import {ChevronDownIcon, LoaderIcon} from 'lucide-react';
import {useCallback, useRef, useState} from 'react';
import {twMerge} from 'tailwind-merge';

const ANIMATION_DURATION = 200;

export function ToolGroupRoot({
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
            data-slot="tool-group-root"
            open={isOpen}
            onOpenChange={handleOpenChange}
            className={twMerge('aui-tool-group-root group/tool-group-root w-full rounded-lg border py-3', className)}
            style={{'--animation-duration': `${ANIMATION_DURATION}ms`} as React.CSSProperties}
            {...props}
        >
            {children}
        </Collapsible.Root>
    );
}

export function ToolGroupTrigger({
    active = false,
    className,
    count,
    ...props
}: React.ComponentProps<typeof Collapsible.Trigger> & {
    active?: boolean;
    count: number;
}) {
    const label = `${count} tool ${count === 1 ? 'call' : 'calls'}`;

    return (
        <Collapsible.Trigger
            data-slot="tool-group-trigger"
            className={twMerge(
                'aui-tool-group-trigger group/trigger flex w-full items-center gap-2 px-4 text-sm transition-colors',
                className
            )}
            {...props}
        >
            {active && <LoaderIcon className="aui-tool-group-trigger-loader size-4 shrink-0 animate-spin" />}

            <span className="aui-tool-group-trigger-label-wrapper relative inline-block grow text-start leading-none font-medium">
                <span>{label}</span>

                {active && (
                    <span aria-hidden className="shimmer pointer-events-none absolute inset-0 motion-reduce:animate-none">
                        {label}
                    </span>
                )}
            </span>

            <ChevronDownIcon
                className={twMerge(
                    'aui-tool-group-trigger-chevron size-4 shrink-0',
                    'transition-transform duration-(--animation-duration) ease-out',
                    'group-data-[state=closed]/trigger:-rotate-90',
                    'group-data-[state=open]/trigger:rotate-0'
                )}
            />
        </Collapsible.Trigger>
    );
}

export function ToolGroupContent({children, className, ...props}: React.ComponentProps<typeof Collapsible.Content>) {
    return (
        <Collapsible.Content
            data-slot="tool-group-content"
            className={twMerge(
                'aui-tool-group-content relative overflow-hidden text-sm outline-none',
                'data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
                'data-[state=closed]:fill-mode-forwards data-[state=closed]:pointer-events-none',
                'data-[state=open]:duration-(--animation-duration) data-[state=closed]:duration-(--animation-duration)',
                className
            )}
            {...props}
        >
            <div className="mt-3 flex flex-col gap-2 border-t px-4 pt-3">{children}</div>
        </Collapsible.Content>
    );
}
