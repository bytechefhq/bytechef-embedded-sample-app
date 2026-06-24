import {AgentSubscriber, HttpAgent, randomUUID} from '@ag-ui/client';
import {
    AppendMessage,
    AssistantRuntimeProvider,
    type SuggestionConfig,
    Suggestions,
    ThreadMessageLike,
    useAui,
    useExternalStoreRuntime,
} from '@assistant-ui/react';
import {ReactNode, useMemo, useState} from 'react';
import {useShallow} from 'zustand/react/shallow';

import {copilotChatUrl} from './constants';
import {ChatStoreI} from './store';

interface EmbeddedCopilotRuntimeProviderPropsI {
    baseUrl: string;
    chatStore: ChatStoreI;
    children: ReactNode;
    environment: string;
    jwtToken: string;
    onRunFinished?: () => void;
    suggestions?: SuggestionConfig[];
    systemPrompt?: string;
    workflowUuid: string;
}

/**
 * Humanizes a raw AG-UI run-error message by stripping Java FQCNs and provider
 * JSON envelopes, mirroring the web client's humanizeAgentErrorMessage utility.
 */
const humanizeRunError = (raw: string): string => {
    const jsonStart = raw.indexOf('{');

    if (jsonStart !== -1) {
        const jsonEnd = raw.lastIndexOf('}');

        if (jsonEnd > jsonStart) {
            const candidate = raw.slice(jsonStart, jsonEnd + 1);

            try {
                const parsed = JSON.parse(candidate) as {error?: {message?: unknown}; message?: unknown};
                const nestedMessage =
                    typeof parsed?.error?.message === 'string'
                        ? parsed.error.message
                        : typeof parsed?.message === 'string'
                          ? parsed.message
                          : null;

                if (nestedMessage && nestedMessage.length > 0) {
                    return nestedMessage;
                }
            } catch {
                // Fall through to regex-based strip.
            }
        }
    }

    const exceptionStripMatch = raw.match(/^[\w.$]+(?:Exception|Error):\s+([\s\S]+)$/);

    if (exceptionStripMatch?.[1] && exceptionStripMatch[1].length > 0) {
        return exceptionStripMatch[1];
    }

    return raw;
};

/**
 * AG-UI tool results arrive as a string in `content`. Parse JSON payloads so the renderer can pretty-print
 * them; fall back to the raw string for plain-text results.
 */
const parseToolResult = (content: string): unknown => {
    if (typeof content !== 'string') {
        return content;
    }

    try {
        return JSON.parse(content);
    } catch {
        return content;
    }
};

/**
 * Interactive tools (askUserQuestion, selectPropertyOption) return a JSON envelope with a `kind` field
 * instead of a plain result. Mirrors the web client's toToolResultDataPart: a recognized `kind` is rendered
 * by a dedicated dataComponents entry (the picker UI) rather than the generic tool-call fallback. The value
 * is the `data-<kind>` part type the thread maps back to its renderer. Only kinds with a renderer in
 * embeddedChatDataComponents are listed; unknown kinds fall through to the plain tool-result rendering.
 */
const TOOL_RESULT_KIND_TO_DATA_PART_TYPE: Record<string, `data-${string}`> = {
    'ask-user-question': 'data-ask-user-question',
    'create-connection': 'data-create-connection',
    'select-connection': 'data-select-connection',
    'select-property-option': 'data-select-property-option',
};

const renderableDataPartType = (result: unknown): `data-${string}` | undefined => {
    if (result != null && typeof result === 'object') {
        const kind = (result as {kind?: unknown}).kind;

        if (typeof kind === 'string') {
            return TOOL_RESULT_KIND_TO_DATA_PART_TYPE[kind];
        }
    }

    return undefined;
};

/**
 * AG-UI has no explicit tool-error flag; a tool that returns an `{error: "…"}` envelope (e.g. askUserQuestion's
 * chip-length validation) is surfaced as an error on the tool card.
 */
const isErrorResult = (result: unknown): boolean =>
    result != null && typeof result === 'object' && typeof (result as {error?: unknown}).error === 'string';

const convertMessage = (message: ThreadMessageLike): ThreadMessageLike => message;

export function EmbeddedCopilotRuntimeProvider({
    baseUrl,
    chatStore,
    children,
    environment,
    jwtToken,
    onRunFinished,
    suggestions,
    systemPrompt,
    workflowUuid,
}: Readonly<EmbeddedCopilotRuntimeProviderPropsI>) {
    const [isRunning, setIsRunning] = useState(false);

    const {
        addMessage,
        addToolCallPart,
        appendToLastAssistantMessage,
        conversationId,
        editUserMessage,
        messages,
        setMessages,
        updateToolCallPart,
    } = chatStore(
        useShallow((state) => ({
            addMessage: state.addMessage,
            addToolCallPart: state.addToolCallPart,
            appendToLastAssistantMessage: state.appendToLastAssistantMessage,
            conversationId: state.conversationId,
            editUserMessage: state.editUserMessage,
            messages: state.messages,
            setMessages: state.setMessages,
            updateToolCallPart: state.updateToolCallPart,
        }))
    );

    const agent = useMemo(
        () =>
            new HttpAgent({
                agentId: 'workflow_editor',
                // @ag-ui/client stores this fetch and later calls it as `this.fetch(...)`. Passing the bare global
                // would invoke native fetch with `this` === the agent instance, which the branded fetch rejects with
                // "Failed to execute 'fetch' on 'Window': Illegal invocation". Wrap it so the receiver stays window.
                fetch: (url: string, requestInit: RequestInit) => fetch(url, requestInit),
                headers: {
                    Authorization: `Bearer ${jwtToken}`,
                    'X-Environment': environment,
                },
                threadId: conversationId,
                url: copilotChatUrl(baseUrl, workflowUuid),
            }),
        [baseUrl, conversationId, environment, jwtToken, workflowUuid]
    );

    const runAgentNow = async () => {
        setIsRunning(true);

        // systemPrompt is intentionally read live from the prop on each turn so edits between turns take effect.
        // Do NOT hoist runAgentNow into a useCallback without adding systemPrompt to its dependency array — the
        // linter won't catch the missing prop dep and a stale-closure bug would silently return.
        const trimmedSystemPrompt = systemPrompt?.trim();

        agent.setState(
            trimmedSystemPrompt
                ? {additionalSystemPrompt: trimmedSystemPrompt, mode: 'BUILD', workflowUuid}
                : {mode: 'BUILD', workflowUuid}
        );

        const subscriber: AgentSubscriber = {
            onRunErrorEvent: ({event}) => {
                const rawMessage = typeof event?.message === 'string' ? event.message.trim() : '';
                const message =
                    rawMessage.length > 0
                        ? humanizeRunError(rawMessage)
                        : 'The agent run failed before completing this turn.';

                addMessage({content: [{data: {message}, type: 'data-run-error'}], role: 'assistant'});
            },
            onRunFinishedEvent: () => {
                onRunFinished?.();
            },
            onTextMessageStartEvent: () => {
                // Each text message from the agent starts a fresh bubble so post-tool-call text
                // doesn't overwrite the pre-tool-call text (appendToLastAssistantMessage skips
                // array-content messages and would land on the wrong bubble otherwise).
                addMessage({content: '', role: 'assistant'});
            },
            onTextMessageContentEvent: ({event, textMessageBuffer}) => {
                appendToLastAssistantMessage(textMessageBuffer + event.delta);
            },
            onTextMessageEndEvent: ({textMessageBuffer}) => {
                appendToLastAssistantMessage(textMessageBuffer);
            },
            onToolCallStartEvent: ({event}) => {
                addToolCallPart({
                    args: {},
                    argsText: '',
                    toolCallId: event.toolCallId,
                    toolName: event.toolCallName,
                    type: 'tool-call',
                });
            },
            // Stream the model's argument JSON into the tool-call part so the expanded panel shows the inputs.
            onToolCallArgsEvent: ({event, partialToolCallArgs, toolCallBuffer}) => {
                updateToolCallPart(event.toolCallId, {args: partialToolCallArgs ?? {}, argsText: toolCallBuffer});
            },
            // Pin the final parsed arguments once the call closes (covers tools whose args arrive without deltas).
            onToolCallEndEvent: ({event, toolCallArgs}) => {
                if (toolCallArgs !== undefined) {
                    updateToolCallPart(event.toolCallId, {
                        args: toolCallArgs,
                        argsText: JSON.stringify(toolCallArgs, null, 2),
                    });
                }
            },
            // Attach the tool result to its card (Input/Result + status icon). Interactive tools
            // (askUserQuestion, selectPropertyOption) additionally return a `kind` envelope that is appended as a
            // data part so its picker UI renders below the card — mirroring AI Hub, which shows both.
            onToolCallResultEvent: ({event}) => {
                const result = parseToolResult(event.content);

                updateToolCallPart(event.toolCallId, {isError: isErrorResult(result), result});

                const dataPartType = renderableDataPartType(result);

                if (dataPartType) {
                    addMessage({content: [{data: result, type: dataPartType}], role: 'assistant'});
                }
            },
        };

        try {
            await agent.runAgent({runId: randomUUID()}, subscriber);
        } finally {
            setIsRunning(false);
        }
    };

    const onNew = async (message: AppendMessage) => {
        if (message.content[0]?.type !== 'text') {
            throw new Error('Only text messages are supported');
        }

        const input = message.content[0].text;

        addMessage({content: input, role: 'user'});
        agent.addMessage({content: input, id: randomUUID(), role: 'user'});

        await runAgentNow();
    };

    const onEdit = async (message: AppendMessage) => {
        if (message.content[0]?.type !== 'text') {
            console.error('Embedded chat edit: only text messages are supported');

            return;
        }

        // The external-store runtime assigns each message id = String(index), so sourceId is the array index
        // of the user message being edited.
        const editedIndex = Number(message.sourceId);

        if (!Number.isInteger(editedIndex) || editedIndex < 0) {
            console.error('Embedded chat edit: could not resolve edited message index from sourceId', message.sourceId);

            return;
        }

        const input = message.content[0].text;

        try {
            // Rewind both layers (UI store + AG-UI agent transcript) to the edit point so the next run sees
            // the corrected history without the stale assistant reply.
            editUserMessage(editedIndex, input);

            agent.setMessages(agent.messages.slice(0, editedIndex));
            agent.addMessage({content: input, id: randomUUID(), role: 'user'});

            await runAgentNow();
        } catch (error) {
            console.error('Embedded chat edit failed:', error);
        }
    };

    const onReload = async (parentId: string | null) => {
        // parentId is the id of the message immediately before the assistant reply being regenerated. The
        // external-store runtime uses idx-based ids, so it's the index of the preceding user message; null
        // when there is no parent (rare for assistant turns).
        const parentIndex = parentId == null ? -1 : Number(parentId);

        if (!Number.isInteger(parentIndex) || parentIndex < -1) {
            console.error('Embedded chat reload: could not resolve message index from parentId', parentId);

            return;
        }

        try {
            // Truncate the UI store to drop the assistant reply (and anything after) but keep the user turn.
            const truncatedMessages = chatStore.getState().messages.slice(0, parentIndex + 1);

            setMessages(truncatedMessages);

            // Mirror the same truncation on the agent transcript and re-run without re-adding the user turn —
            // it's already in the slice we kept.
            agent.setMessages(agent.messages.slice(0, parentIndex + 1));

            await runAgentNow();
        } catch (error) {
            console.error('Embedded chat reload failed:', error);
        }
    };

    const onCancel = async () => {
        agent.abortRun();
    };

    const runtime = useExternalStoreRuntime({
        convertMessage,
        isRunning,
        messages,
        onCancel,
        onEdit,
        onNew,
        onReload,
    });

    // Welcome-screen suggestions registered via the new assistant-ui suggestions API. ThreadPrimitive.Suggestions
    // (in workflow-chat-thread) reads them from `s.suggestions.suggestions`.
    const aui = useAui({suggestions: Suggestions(suggestions ?? [])}, {parent: null});

    return (
        <AssistantRuntimeProvider aui={aui} runtime={runtime}>
            {children}
        </AssistantRuntimeProvider>
    );
}
