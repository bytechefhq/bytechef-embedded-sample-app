"use client";

import {type ComponentPropsWithRef, forwardRef} from 'react';
import {Slot} from 'radix-ui';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import {twMerge} from 'tailwind-merge';

// Minimal Button shim
type ButtonVariant = 'default' | 'ghost' | 'outline';
type ButtonSize = 'icon' | 'sm' | 'default';

interface ButtonPropsI extends ComponentPropsWithRef<'button'> {
    size?: ButtonSize;
    variant?: ButtonVariant;
}

const Button = forwardRef<HTMLButtonElement, ButtonPropsI>(
    ({className, size = 'default', variant = 'default', ...rest}, ref) => {
        const variantClass =
            variant === 'ghost'
                ? 'bg-transparent hover:bg-accent hover:text-accent-foreground'
                : variant === 'outline'
                  ? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90';

        const sizeClass = size === 'icon' ? 'size-8 p-0' : size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-4 py-2';

        return (
            <button
                ref={ref}
                className={twMerge(
                    'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
                    variantClass,
                    sizeClass,
                    className
                )}
                {...rest}
            />
        );
    }
);

Button.displayName = 'Button';

export {Button};

export type TooltipIconButtonPropsI = ComponentPropsWithRef<typeof Button> & {
    side?: 'top' | 'bottom' | 'left' | 'right';
    tooltip: string;
};

export const TooltipIconButton = forwardRef<HTMLButtonElement, TooltipIconButtonPropsI>(
    ({children, className, side = 'bottom', tooltip, ...rest}, ref) => {
        return (
            <TooltipPrimitive.Provider delayDuration={0}>
                <TooltipPrimitive.Root>
                    <TooltipPrimitive.Trigger asChild>
                        <Button
                            ref={ref}
                            size="icon"
                            variant="ghost"
                            {...rest}
                            className={twMerge('aui-button-icon size-6 p-1', className)}
                        >
                            <Slot.Slottable>{children}</Slot.Slottable>
                            <span className="aui-sr-only sr-only">{tooltip}</span>
                        </Button>
                    </TooltipPrimitive.Trigger>
                    <TooltipPrimitive.Content side={side}>{tooltip}</TooltipPrimitive.Content>
                </TooltipPrimitive.Root>
            </TooltipPrimitive.Provider>
        );
    }
);

TooltipIconButton.displayName = 'TooltipIconButton';
