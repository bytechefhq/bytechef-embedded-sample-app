import {AgentSubscriber, HttpAgent, randomUUID} from '@ag-ui/client';
import {AppendMessage, AssistantRuntimeProvider, ThreadMessageLike, useExternalStoreRuntime} from '@assistant-ui/react';
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

const convertMessage = (message: ThreadMessageLike): ThreadMessageLike => message;

export function EmbeddedCopilotRuntimeProvider({
    baseUrl,
    chatStore,
    children,
    environment,
    jwtToken,
    onRunFinished,
    workflowUuid,
}: Readonly<EmbeddedCopilotRuntimeProviderPropsI>) {
    const [isRunning, setIsRunning] = useState(false);

    const {addMessage, appendToLastAssistantMessage, conversationId, editUserMessage, messages, setMessages} = chatStore(
        useShallow((state) => ({
            addMessage: state.addMessage,
            appendToLastAssistantMessage: state.appendToLastAssistantMessage,
            conversationId: state.conversationId,
            editUserMessage: state.editUserMessage,
            messages: state.messages,
            setMessages: state.setMessages,
        }))
    );

    const agent = useMemo(
        () =>
            new HttpAgent({
                agentId: 'workflow_editor',
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

        agent.setState({mode: 'BUILD', workflowUuid});

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
                addMessage({
                    content: [{args: {}, argsText: '', toolCallId: event.toolCallId, toolName: event.toolCallName, type: 'tool-call'}],
                    role: 'assistant',
                });
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

    return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
