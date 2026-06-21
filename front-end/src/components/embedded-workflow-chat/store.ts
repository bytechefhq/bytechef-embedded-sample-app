import {ThreadMessageLike} from '@assistant-ui/react';
import {create} from 'zustand';

interface ChatStateI {
    conversationId: string;
    generateConversationId: () => void;

    messages: ThreadMessageLike[];
    addMessage: (message: ThreadMessageLike) => void;
    appendToLastAssistantMessage: (text: string) => void;
    editUserMessage: (index: number, text: string) => void;
    resetMessages: () => void;
    setMessages: (messages: ThreadMessageLike[]) => void;

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
