import {ThreadMessageLike} from '@assistant-ui/react';
import {create} from 'zustand';

interface ChatStateI {
    conversationId: string;
    generateConversationId: () => void;

    messages: ThreadMessageLike[];
    addMessage: (message: ThreadMessageLike) => void;
    addToolCallPart: (part: Record<string, unknown>) => void;
    appendToLastAssistantMessage: (text: string) => void;
    editUserMessage: (index: number, text: string) => void;
    resetMessages: () => void;
    setMessages: (messages: ThreadMessageLike[]) => void;
    updateToolCallPart: (toolCallId: string, patch: Record<string, unknown>) => void;

    savedState: {conversationId: string; messages: ThreadMessageLike[]} | null;
    saveConversationState: () => void;
    restoreConversationState: () => void;
}

const generateRandomId = (): string => Math.random().toString(36).substring(2, 15);

export const createChatStore = () =>
    create<ChatStateI>()((set) => ({
        conversationId: generateRandomId(),
        generateConversationId: () => set({conversationId: generateRandomId()}),

        messages: [],
        addMessage: (message) =>
            set((state) => ({
                ...state,
                messages: [...state.messages, message],
            })),
        addToolCallPart: (part: Record<string, unknown>) =>
            set((state) => {
                const messages = [...state.messages];
                const lastIndex = messages.length - 1;
                const last = messages[lastIndex];

                // Group consecutive tool calls into one assistant message so their cards stack tightly (like
                // AI Hub), rather than each landing in its own message with the full inter-message gap (gap-y-8).
                const lastIsToolGroup =
                    last?.role === 'assistant' &&
                    Array.isArray(last.content) &&
                    last.content.length > 0 &&
                    (last.content as unknown as Array<Record<string, unknown>>).every((p) => p?.type === 'tool-call');

                if (lastIsToolGroup) {
                    const content = [...(last.content as unknown as Array<Record<string, unknown>>), part];

                    messages[lastIndex] = {...last, content} as unknown as ThreadMessageLike;

                    return {...state, messages};
                }

                messages.push({content: [part], role: 'assistant'} as unknown as ThreadMessageLike);

                return {...state, messages};
            }),
        appendToLastAssistantMessage: (text: string) =>
            set((state) => {
                const messages = [...state.messages];

                for (let i = messages.length - 1; i >= 0; i--) {
                    const message = messages[i] as ThreadMessageLike;

                    if (message.role === 'assistant' && typeof message.content === 'string') {
                        messages[i] = {...message, content: text} as ThreadMessageLike;

                        return {...state, messages};
                    }
                }

                messages.push({content: text, role: 'assistant'} as ThreadMessageLike);

                return {...state, messages};
            }),
        editUserMessage: (index: number, text: string) =>
            set((state) => {
                if (index < 0 || index >= state.messages.length) {
                    return state;
                }

                const target = state.messages[index];

                if (target?.role !== 'user') {
                    return state;
                }

                const truncated = state.messages.slice(0, index);

                truncated.push({...target, content: text} as ThreadMessageLike);

                return {...state, messages: truncated};
            }),
        resetMessages: () => set({messages: []}),
        setMessages: (messages: ThreadMessageLike[]) => set({messages}),
        updateToolCallPart: (toolCallId: string, patch: Record<string, unknown>) =>
            set((state) => {
                let changed = false;

                const messages = state.messages.map((message) => {
                    if (!Array.isArray(message.content)) {
                        return message;
                    }

                    let messageChanged = false;

                    const parts = message.content as unknown as Array<Record<string, unknown>>;

                    const content = parts.map((part) => {
                        if (part?.type === 'tool-call' && part.toolCallId === toolCallId) {
                            messageChanged = true;
                            changed = true;

                            return {...part, ...patch};
                        }

                        return part;
                    });

                    return messageChanged ? ({...message, content} as unknown as ThreadMessageLike) : message;
                });

                return changed ? {...state, messages} : state;
            }),

        savedState: null,
        saveConversationState: () =>
            set((state) => ({
                ...state,
                savedState: {
                    conversationId: state.conversationId,
                    messages: state.messages,
                },
            })),
        restoreConversationState: () =>
            set((state) => {
                if (!state.savedState) {
                    return state;
                }

                return {
                    ...state,
                    conversationId: state.savedState.conversationId,
                    messages: state.savedState.messages,
                    savedState: null,
                };
            }),
    }));

export type ChatStoreI = ReturnType<typeof createChatStore>;
