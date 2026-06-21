"use client";

import * as Collapsible from '@radix-ui/react-collapsible';
import {type ReasoningMessagePartComponent, useScrollLock} from '@assistant-ui/react';
import {BrainIcon, ChevronDownIcon} from 'lucide-react';
import {memo, useCallback, useRef, useState} from 'react';
import {twMerge} from 'tailwind-merge';

import {MarkdownText} from './markdown-text';

const ANIMATION_DURATION = 200;

export function ReasoningRoot({
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
            data-slot="reasoning-root"
            open={isOpen}
            onOpenChange={handleOpenChange}
            className={twMerge('aui-reasoning-root group/reasoning-root mb-4 w-full rounded-lg border px-3 py-2', className)}
            style={{'--animation-duration': `${ANIMATION_DURATION}ms`} as React.CSSProperties}
            {...props}
        >
            {children}
        </Collapsible.Root>
    );
}

export function ReasoningTrigger({
    active,
    className,
    duration,
    ...props
}: React.ComponentProps<typeof Collapsible.Trigger> & {
    active?: boolean;
    duration?: number;
}) {
    const durationText = duration ? ` (${duration}s)` : '';

    return (
        <Collapsible.Trigger
            data-slot="reasoning-trigger"
            className={twMerge(
                'aui-reasoning-trigger group/trigger text-muted-foreground hover:text-foreground flex max-w-[75%] items-center gap-2 py-1 text-sm transition-colors',
                className
            )}
            {...props}
        >
            <BrainIcon className="aui-reasoning-trigger-icon size-4 shrink-0" />

            <span className="aui-reasoning-trigger-label-wrapper relative inline-block leading-none">
                <span>Reasoning{durationText}</span>

                {active ? (
                    <span aria-hidden className="shimmer pointer-events-none absolute inset-0 motion-reduce:animate-none">
                        Reasoning{durationText}
                    </span>
                ) : null}
            </span>

            <ChevronDownIcon
                className={twMerge(
                    'aui-reasoning-trigger-chevron mt-0.5 size-4 shrink-0',
                    'transition-transform duration-(--animation-duration) ease-out',
                    'group-data-[state=closed]/trigger:-rotate-90',
                    'group-data-[state=open]/trigger:rotate-0'
                )}
            />
        </Collapsible.Trigger>
    );
}

export function ReasoningContent({children, className, ...props}: React.ComponentProps<typeof Collapsible.Content>) {
    return (
        <Collapsible.Content
            data-slot="reasoning-content"
            className={twMerge(
                'aui-reasoning-content text-muted-foreground relative overflow-hidden text-sm outline-none',
                'group/collapsible-content ease-out',
                'data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
                'data-[state=closed]:fill-mode-forwards data-[state=closed]:pointer-events-none',
                'data-[state=open]:duration-(--animation-duration) data-[state=closed]:duration-(--animation-duration)',
                className
            )}
            {...props}
        >
            {children}
        </Collapsible.Content>
    );
}

export function ReasoningText({className, ...props}: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="reasoning-text"
            className={twMerge(
                'aui-reasoning-text relative z-0 max-h-64 space-y-4 overflow-y-auto ps-6 pt-2 pb-2 leading-relaxed',
                className
            )}
            {...props}
        />
    );
}

const ReasoningImpl: ReasoningMessagePartComponent = () => <MarkdownText />;

export const Reasoning = memo(ReasoningImpl) as unknown as ReasoningMessagePartComponent;

Reasoning.displayName = 'Reasoning';
