"use client";

import {
    ActionBarMorePrimitive,
    ActionBarPrimitive,
    type AssistantState,
    AuiIf,
    BranchPickerPrimitive,
    ComposerPrimitive,
    type DataMessagePartComponent,
    type DataMessagePartProps,
    ErrorPrimitive,
    groupPartByType,
    MessagePrimitive,
    SuggestionPrimitive,
    ThreadPrimitive,
    useAuiState,
} from '@assistant-ui/react';
import {
    ArrowDownIcon,
    ArrowUpIcon,
    CheckIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CopyIcon,
    DownloadIcon,
    MoreHorizontalIcon,
    PencilIcon,
    RefreshCwIcon,
    SquareIcon,
} from 'lucide-react';
import {createContext, type FC, useContext} from 'react';
import {twMerge} from 'tailwind-merge';

import {MarkdownText} from './assistant-ui/markdown-text';
import {Reasoning, ReasoningContent, ReasoningRoot, ReasoningText, ReasoningTrigger} from './assistant-ui/reasoning';
import {ToolFallback} from './assistant-ui/tool-fallback';
import {ToolGroupContent, ToolGroupRoot, ToolGroupTrigger} from './assistant-ui/tool-group';
import {Button, TooltipIconButton} from './assistant-ui/tooltip-icon-button';

/**
 * Registry mapping data-part event names (e.g. "ask-user-question") to the component that renders
 * them. Supplied to AssistantMessage through context since messages are rendered via a render-prop.
 */
const ThreadDataComponentsContext = createContext<Record<string, DataMessagePartComponent> | undefined>(undefined);

export interface WorkflowChatSuggestionI {
    action: string;
    label: string;
    title: string;
}

interface ThreadPropsI {
    dataComponents?: Record<string, DataMessagePartComponent>;
}

// Startup exposes a loading placeholder thread; treat it as a new chat so the composer mounts
// centered with the suggestions below it. Loads after startup keep the docked (sticky) layout.
const isNewChatView = (state: AssistantState) =>
    state.thread.messages.length === 0 && (!state.thread.isLoading || state.threads.isLoading);

export const WorkflowChatThread: FC<ThreadPropsI> = ({dataComponents}) => {
    const isEmpty = useAuiState(isNewChatView);

    return (
        <ThreadDataComponentsContext.Provider value={dataComponents}>
            <ThreadPrimitive.Root
                className="aui-root aui-thread-root bg-background @container flex h-full flex-col"
                style={{
                    ['--composer-padding' as string]: '10px',
                    ['--composer-radius' as string]: '24px',
                    ['--thread-max-width' as string]: '44rem',
                }}
            >
                <ThreadPrimitive.Viewport
                    turnAnchor="top"
                    data-slot="aui_thread-viewport"
                    className="relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth"
                >
                    <div
                        className={twMerge(
                            'mx-auto flex w-full max-w-(--thread-max-width) flex-1 flex-col px-4 pt-4',
                            isEmpty && 'justify-center'
                        )}
                    >
                        <AuiIf condition={isNewChatView}>
                            <ThreadWelcome />
                        </AuiIf>

                        <div
                            data-slot="aui_message-group"
                            className="mb-10 flex flex-col gap-y-8 empty:hidden"
                        >
                            <ThreadPrimitive.Messages>{() => <ThreadMessage />}</ThreadPrimitive.Messages>
                        </div>

                        <ThreadPrimitive.ViewportFooter
                            className={twMerge(
                                'aui-thread-viewport-footer bg-background flex flex-col gap-4 overflow-visible pb-4 md:pb-6',
                                !isEmpty && 'sticky bottom-0 mt-auto rounded-t-(--composer-radius)'
                            )}
                        >
                            <ThreadScrollToBottom />
                            <Composer />
                            <AuiIf condition={(state) => isNewChatView(state) && state.composer.isEmpty}>
                                <ThreadSuggestions />
                            </AuiIf>
                        </ThreadPrimitive.ViewportFooter>
                    </div>
                </ThreadPrimitive.Viewport>
            </ThreadPrimitive.Root>
        </ThreadDataComponentsContext.Provider>
    );
};

const ThreadMessage: FC = () => {
    const role = useAuiState((state) => state.message.role);
    const isEditing = useAuiState((state) => state.message.composer.isEditing);

    if (isEditing) {
        return <EditComposer />;
    }

    if (role === 'user') {
        return <UserMessage />;
    }

    return <AssistantMessage />;
};

const ThreadScrollToBottom: FC = () => {
    return (
        <ThreadPrimitive.ScrollToBottom asChild>
            <TooltipIconButton
                tooltip="Scroll to bottom"
                variant="outline"
                className="aui-thread-scroll-to-bottom dark:border-border dark:bg-background dark:hover:bg-accent absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible"
            >
                <ArrowDownIcon />
            </TooltipIconButton>
        </ThreadPrimitive.ScrollToBottom>
    );
};

const ThreadWelcome: FC = () => {
    return (
        <div className="aui-thread-welcome-root mb-6 flex flex-col items-center px-4 text-center">
            <h1 className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-2xl font-semibold duration-200">
                How can I help you today?
            </h1>
        </div>
    );
};

// Suggestions are configured at the runtime level (the new assistant-ui suggestions API) via
// EmbeddedCopilotRuntimeProvider; ThreadPrimitive.Suggestions reads them from `s.suggestions.suggestions`.
const ThreadSuggestions: FC = () => {
    return (
        <div className="aui-thread-welcome-suggestions flex w-full flex-wrap items-center justify-center gap-2 px-4">
            <ThreadPrimitive.Suggestions>{() => <ThreadSuggestionItem />}</ThreadPrimitive.Suggestions>
        </div>
    );
};

const ThreadSuggestionItem: FC = () => {
    return (
        <div className="aui-thread-welcome-suggestion-display fade-in slide-in-from-bottom-2 animate-in fill-mode-both duration-200">
            <SuggestionPrimitive.Trigger
                send
                render={
                    <Button
                        variant="ghost"
                        className="aui-thread-welcome-suggestion text-foreground hover:bg-muted border-border/60 h-auto gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-normal whitespace-nowrap transition-colors"
                    />
                }
            >
                <SuggestionPrimitive.Title className="aui-thread-welcome-suggestion-text-1" />
                <SuggestionPrimitive.Description className="aui-thread-welcome-suggestion-text-2 empty:hidden" />
            </SuggestionPrimitive.Trigger>
        </div>
    );
};

const Composer: FC = () => {
    return (
        <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col">
            <div
                data-slot="aui_composer-shell"
                className="bg-background focus-within:border-ring/75 focus-within:ring-ring/20 flex w-full flex-col gap-2 rounded-(--composer-radius) border p-(--composer-padding) transition-shadow focus-within:ring-2"
            >
                <ComposerPrimitive.Input
                    placeholder="Send a message..."
                    className="aui-composer-input placeholder:text-muted-foreground/80 max-h-32 min-h-10 w-full resize-none bg-transparent px-1.75 py-1 text-sm outline-none"
                    rows={1}
                    autoFocus
                    aria-label="Message input"
                />

                <ComposerAction />
            </div>
        </ComposerPrimitive.Root>
    );
};

const ComposerAction: FC = () => {
    return (
        <div className="aui-composer-action-wrapper relative flex items-center justify-end">
            <AuiIf condition={(state) => !state.thread.isRunning}>
                <ComposerPrimitive.Send asChild>
                    <TooltipIconButton
                        tooltip="Send message"
                        side="bottom"
                        type="button"
                        variant="default"
                        size="icon"
                        className="aui-composer-send size-8 rounded-full"
                        aria-label="Send message"
                    >
                        <ArrowUpIcon className="aui-composer-send-icon size-4" />
                    </TooltipIconButton>
                </ComposerPrimitive.Send>
            </AuiIf>

            <AuiIf condition={(state) => state.thread.isRunning}>
                <ComposerPrimitive.Cancel asChild>
                    <Button
                        type="button"
                        variant="default"
                        size="icon"
                        className="aui-composer-cancel size-8 rounded-full"
                        aria-label="Stop generating"
                    >
                        <SquareIcon className="aui-composer-cancel-icon size-3 fill-current" />
                    </Button>
                </ComposerPrimitive.Cancel>
            </AuiIf>
        </div>
    );
};

const MessageError: FC = () => {
    return (
        <MessagePrimitive.Error>
            <ErrorPrimitive.Root className="aui-message-error-root border-destructive bg-destructive/10 text-destructive dark:bg-destructive/5 mt-2 rounded-md border p-3 text-sm dark:text-red-200">
                <ErrorPrimitive.Message className="aui-message-error-message line-clamp-2" />
            </ErrorPrimitive.Root>
        </MessagePrimitive.Error>
    );
};

const AssistantMessage: FC = () => {
    const dataComponents = useContext(ThreadDataComponentsContext);

    const ACTION_BAR_PT = 'pt-1.5';
    const ACTION_BAR_HEIGHT = `-mb-7.5 min-h-7.5 ${ACTION_BAR_PT}`;

    return (
        <MessagePrimitive.Root
            data-slot="aui_assistant-message-root"
            data-role="assistant"
            className="fade-in slide-in-from-bottom-1 animate-in relative duration-150"
        >
            <div
                data-slot="aui_assistant-message-content"
                className="text-foreground px-2 leading-relaxed wrap-break-word [contain-intrinsic-size:auto_24px] [content-visibility:auto]"
            >
                <MessagePrimitive.GroupedParts
                    groupBy={groupPartByType({
                        reasoning: ['group-chainOfThought', 'group-reasoning'],
                        'tool-call': ['group-chainOfThought', 'group-tool'],
                    })}
                >
                    {({children, part}) => {
                        switch (part.type) {
                            case 'group-chainOfThought':
                                return <div data-slot="aui_chain-of-thought">{children}</div>;
                            case 'group-reasoning': {
                                const running = part.status.type === 'running';

                                return (
                                    <ReasoningRoot defaultOpen={running}>
                                        <ReasoningTrigger active={running} />
                                        <ReasoningContent aria-busy={running}>
                                            <ReasoningText>{children}</ReasoningText>
                                        </ReasoningContent>
                                    </ReasoningRoot>
                                );
                            }
                            case 'group-tool':
                                return (
                                    <ToolGroupRoot>
                                        <ToolGroupTrigger
                                            count={part.indices.length}
                                            active={part.status.type === 'running'}
                                        />
                                        <ToolGroupContent>{children}</ToolGroupContent>
                                    </ToolGroupRoot>
                                );
                            case 'text':
                                return <MarkdownText />;
                            case 'reasoning':
                                return <Reasoning {...part} />;
                            case 'tool-call':
                                return part.toolUI ?? <ToolFallback {...part} />;
                            case 'data': {
                                const dataPart = part as DataMessagePartProps;
                                const DataComponent = dataComponents?.[dataPart.name];

                                return DataComponent ? <DataComponent {...dataPart} /> : null;
                            }
                            default:
                                return null;
                        }
                    }}
                </MessagePrimitive.GroupedParts>

                <MessageError />
            </div>

            <div data-slot="aui_assistant-message-footer" className={twMerge('ms-2 flex items-center', ACTION_BAR_HEIGHT)}>
                <BranchPicker />
                <AssistantActionBar />
            </div>
        </MessagePrimitive.Root>
    );
};

const AssistantActionBar: FC = () => {
    return (
        <ActionBarPrimitive.Root
            hideWhenRunning
            autohide="not-last"
            className="aui-assistant-action-bar-root text-muted-foreground col-start-3 row-start-2 -ms-1 flex gap-1"
        >
            <ActionBarPrimitive.Copy asChild>
                <TooltipIconButton tooltip="Copy">
                    <AuiIf condition={(state) => state.message.isCopied}>
                        <CheckIcon />
                    </AuiIf>
                    <AuiIf condition={(state) => !state.message.isCopied}>
                        <CopyIcon />
                    </AuiIf>
                </TooltipIconButton>
            </ActionBarPrimitive.Copy>

            <ActionBarPrimitive.Reload asChild>
                <TooltipIconButton tooltip="Refresh">
                    <RefreshCwIcon />
                </TooltipIconButton>
            </ActionBarPrimitive.Reload>

            <ActionBarMorePrimitive.Root>
                <ActionBarMorePrimitive.Trigger asChild>
                    <TooltipIconButton tooltip="More" className="data-[state=open]:bg-accent">
                        <MoreHorizontalIcon />
                    </TooltipIconButton>
                </ActionBarMorePrimitive.Trigger>

                <ActionBarMorePrimitive.Content
                    side="bottom"
                    align="start"
                    className="aui-action-bar-more-content bg-popover text-popover-foreground z-50 min-w-32 overflow-hidden rounded-md border p-1 shadow-md"
                >
                    <ActionBarPrimitive.ExportMarkdown asChild>
                        <ActionBarMorePrimitive.Item className="aui-action-bar-more-item hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none">
                            <DownloadIcon className="size-4" />
                            Export as Markdown
                        </ActionBarMorePrimitive.Item>
                    </ActionBarPrimitive.ExportMarkdown>
                </ActionBarMorePrimitive.Content>
            </ActionBarMorePrimitive.Root>
        </ActionBarPrimitive.Root>
    );
};

const UserMessage: FC = () => {
    return (
        <MessagePrimitive.Root
            data-slot="aui_user-message-root"
            data-role="user"
            className="fade-in slide-in-from-bottom-1 animate-in grid auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 duration-150 [contain-intrinsic-size:auto_60px] [content-visibility:auto] [&:where(>*)]:col-start-2"
        >
            <div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
                <div className="aui-user-message-content peer bg-muted text-foreground rounded-2xl px-4 py-2.5 wrap-break-word empty:hidden">
                    <MessagePrimitive.Parts />
                </div>

                <div className="aui-user-action-bar-wrapper absolute start-0 top-1/2 -translate-x-full -translate-y-1/2 pe-2 peer-empty:hidden rtl:translate-x-full">
                    <UserActionBar />
                </div>
            </div>

            <BranchPicker
                data-slot="aui_user-branch-picker"
                className="col-span-full col-start-1 row-start-3 -me-1 justify-end"
            />
        </MessagePrimitive.Root>
    );
};

const UserActionBar: FC = () => {
    return (
        <ActionBarPrimitive.Root
            hideWhenRunning
            autohide="not-last"
            className="aui-user-action-bar-root flex flex-col items-end"
        >
            <ActionBarPrimitive.Edit asChild>
                <TooltipIconButton tooltip="Edit" className="aui-user-action-edit p-4">
                    <PencilIcon />
                </TooltipIconButton>
            </ActionBarPrimitive.Edit>
        </ActionBarPrimitive.Root>
    );
};

const EditComposer: FC = () => {
    return (
        <MessagePrimitive.Root data-slot="aui_edit-composer-wrapper" className="flex flex-col px-2">
            <ComposerPrimitive.Root className="aui-edit-composer-root bg-muted ms-auto flex w-full max-w-[85%] flex-col rounded-2xl">
                <ComposerPrimitive.Input
                    className="aui-edit-composer-input text-foreground min-h-14 w-full resize-none border-0 bg-transparent p-4 text-sm shadow-none ring-0 outline-none focus:ring-0 focus-visible:ring-0"
                    autoFocus
                />

                <div className="aui-edit-composer-footer mx-3 mb-3 flex items-center gap-2 self-end">
                    <ComposerPrimitive.Cancel asChild>
                        <Button variant="ghost" size="sm">
                            Cancel
                        </Button>
                    </ComposerPrimitive.Cancel>

                    <ComposerPrimitive.Send asChild>
                        <Button size="sm">Update</Button>
                    </ComposerPrimitive.Send>
                </div>
            </ComposerPrimitive.Root>
        </MessagePrimitive.Root>
    );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({className, ...rest}) => {
    return (
        <BranchPickerPrimitive.Root
            hideWhenSingleBranch
            className={twMerge(
                'aui-branch-picker-root text-muted-foreground -ms-2 me-2 inline-flex items-center text-xs',
                className
            )}
            {...rest}
        >
            <BranchPickerPrimitive.Previous asChild>
                <TooltipIconButton tooltip="Previous">
                    <ChevronLeftIcon />
                </TooltipIconButton>
            </BranchPickerPrimitive.Previous>

            <span className="aui-branch-picker-state font-medium">
                <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
            </span>

            <BranchPickerPrimitive.Next asChild>
                <TooltipIconButton tooltip="Next">
                    <ChevronRightIcon />
                </TooltipIconButton>
            </BranchPickerPrimitive.Next>
        </BranchPickerPrimitive.Root>
    );
};
