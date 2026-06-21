"use client";

import "@assistant-ui/react-markdown/styles/dot.css";

import {
    type CodeHeaderProps,
    MarkdownTextPrimitive,
    unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
    useIsMarkdownCodeBlock,
} from '@assistant-ui/react-markdown';
import {CheckIcon, CopyIcon} from 'lucide-react';
import {type FC, memo, useState} from 'react';
import remarkGfm from 'remark-gfm';
import {twMerge} from 'tailwind-merge';

import {TooltipIconButton} from './tooltip-icon-button';

const MarkdownTextImpl = () => {
    return <MarkdownTextPrimitive className="aui-md" components={defaultComponents} remarkPlugins={[remarkGfm]} />;
};

export const MarkdownText = memo(MarkdownTextImpl);

const useCopyToClipboard = ({copiedDuration = 3000}: {copiedDuration?: number} = {}) => {
    const [isCopied, setIsCopied] = useState<boolean>(false);

    const copyToClipboard = (value: string) => {
        if (!value || typeof navigator === 'undefined' || !navigator.clipboard) {
            return;
        }

        navigator.clipboard.writeText(value).then(
            () => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), copiedDuration);
            },
            () => {}
        );
    };

    return {copyToClipboard, isCopied};
};

const CodeHeader: FC<CodeHeaderProps> = ({code, language}) => {
    const {copyToClipboard, isCopied} = useCopyToClipboard();

    const onCopy = () => {
        if (!code || isCopied) {
            return;
        }

        copyToClipboard(code);
    };

    return (
        <div className="aui-code-header-root border-border/50 bg-muted/50 mt-2.5 flex items-center justify-between rounded-t-lg border border-b-0 px-3 py-1.5 text-xs">
            <span className="aui-code-header-language text-muted-foreground font-medium lowercase">{language}</span>

            <TooltipIconButton tooltip="Copy" onClick={onCopy}>
                {!isCopied && <CopyIcon />}
                {isCopied && <CheckIcon />}
            </TooltipIconButton>
        </div>
    );
};

const defaultComponents = memoizeMarkdownComponents({
    CodeHeader,
    a: ({className, ...props}) => (
        <a
            className={twMerge('aui-md-a text-primary hover:text-primary/80 underline underline-offset-2', className)}
            {...props}
        />
    ),
    blockquote: ({className, ...props}) => (
        <blockquote
            className={twMerge(
                'aui-md-blockquote border-muted-foreground/30 text-muted-foreground my-2.5 border-s-2 ps-3 italic',
                className
            )}
            {...props}
        />
    ),
    code: function Code({className, ...props}) {
        const isCodeBlock = useIsMarkdownCodeBlock();

        return (
            <code
                className={twMerge(
                    !isCodeBlock &&
                        'aui-md-inline-code border-border/50 bg-muted/50 rounded-md border px-1.5 py-0.5 font-mono text-[0.85em]',
                    className
                )}
                {...props}
            />
        );
    },
    h1: ({className, ...props}) => (
        <h1
            className={twMerge(
                'aui-md-h1 mb-2 scroll-m-20 text-base font-semibold first:mt-0 last:mb-0',
                className
            )}
            {...props}
        />
    ),
    h2: ({className, ...props}) => (
        <h2
            className={twMerge(
                'aui-md-h2 mt-3 mb-1.5 scroll-m-20 text-sm font-semibold first:mt-0 last:mb-0',
                className
            )}
            {...props}
        />
    ),
    h3: ({className, ...props}) => (
        <h3
            className={twMerge(
                'aui-md-h3 mt-2.5 mb-1 scroll-m-20 text-sm font-semibold first:mt-0 last:mb-0',
                className
            )}
            {...props}
        />
    ),
    h4: ({className, ...props}) => (
        <h4
            className={twMerge('aui-md-h4 mt-2 mb-1 scroll-m-20 text-sm font-medium first:mt-0 last:mb-0', className)}
            {...props}
        />
    ),
    h5: ({className, ...props}) => (
        <h5
            className={twMerge('aui-md-h5 mt-2 mb-1 text-sm font-medium first:mt-0 last:mb-0', className)}
            {...props}
        />
    ),
    h6: ({className, ...props}) => (
        <h6
            className={twMerge('aui-md-h6 mt-2 mb-1 text-sm font-medium first:mt-0 last:mb-0', className)}
            {...props}
        />
    ),
    hr: ({className, ...props}) => (
        <hr className={twMerge('aui-md-hr border-muted-foreground/20 my-2', className)} {...props} />
    ),
    li: ({className, ...props}) => <li className={twMerge('aui-md-li leading-normal', className)} {...props} />,
    ol: ({className, ...props}) => (
        <ol
            className={twMerge('aui-md-ol marker:text-muted-foreground my-2 ms-4 list-decimal [&>li]:mt-1', className)}
            {...props}
        />
    ),
    p: ({className, ...props}) => (
        <p
            className={twMerge('aui-md-p my-2.5 leading-normal first:mt-0 last:mb-0', className)}
            {...props}
        />
    ),
    pre: ({className, ...props}) => (
        <pre
            className={twMerge(
                'aui-md-pre border-border/50 bg-muted/30 overflow-x-auto rounded-t-none rounded-b-lg border border-t-0 p-3 text-xs leading-relaxed',
                className
            )}
            {...props}
        />
    ),
    sup: ({className, ...props}) => (
        <sup className={twMerge('aui-md-sup [&>a]:text-xs [&>a]:no-underline', className)} {...props} />
    ),
    table: ({className, ...props}) => (
        <table
            className={twMerge('aui-md-table my-2 w-full border-separate border-spacing-0 overflow-y-auto', className)}
            {...props}
        />
    ),
    td: ({className, ...props}) => (
        <td
            className={twMerge(
                'aui-md-td border-muted-foreground/20 border-s border-b px-2 py-1 text-start last:border-e [[align=center]]:text-center [[align=right]]:text-right',
                className
            )}
            {...props}
        />
    ),
    th: ({className, ...props}) => (
        <th
            className={twMerge(
                'aui-md-th bg-muted px-2 py-1 text-start font-medium first:rounded-ss-lg last:rounded-se-lg [[align=center]]:text-center [[align=right]]:text-right',
                className
            )}
            {...props}
        />
    ),
    tr: ({className, ...props}) => (
        <tr
            className={twMerge(
                'aui-md-tr m-0 border-b p-0 first:border-t [&:last-child>td:first-child]:rounded-es-lg [&:last-child>td:last-child]:rounded-ee-lg',
                className
            )}
            {...props}
        />
    ),
    ul: ({className, ...props}) => (
        <ul
            className={twMerge('aui-md-ul marker:text-muted-foreground my-2 ms-4 list-disc [&>li]:mt-1', className)}
            {...props}
        />
    ),
});
