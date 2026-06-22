import {BotMessageSquareIcon, MessageSquareXIcon} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {twMerge} from 'tailwind-merge';

import {createSkeletonWorkflow} from './api';
import {DEFAULT_BASE_URL} from './constants';
import {embeddedChatDataComponents} from './dataComponents';
import EmbeddedChatBoundary from './EmbeddedChatBoundary';
import {EmbeddedCopilotRuntimeProvider} from './EmbeddedCopilotRuntimeProvider';
import {createChatStore} from './store';
import {WorkflowChatThread} from './workflow-chat-thread';

export interface EmbeddedWorkflowChatPropsI {
    baseUrl?: string;
    className?: string;
    description?: string;
    environment?: 'DEVELOPMENT' | 'PRODUCTION' | 'STAGING';
    jwtToken: string;
    onWorkflowReady?: (workflowUuid: string) => void;
    suggestions?: string[];
    systemPrompt?: string;
    title?: string;
}

const EmbeddedWorkflowChat = ({
    baseUrl = DEFAULT_BASE_URL,
    className,
    description,
    environment = 'PRODUCTION',
    jwtToken,
    onWorkflowReady,
    suggestions,
    systemPrompt,
    title = 'AI Assistant',
}: EmbeddedWorkflowChatPropsI) => {
    const [chatStore] = useState(createChatStore);
    const [workflowUuid, setWorkflowUuid] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const readyFiredRef = useRef(false);

    const handleNewConversation = () => {
        chatStore.getState().resetMessages();
        chatStore.getState().generateConversationId();
    };

    useEffect(() => {
        let cancelled = false;

        createSkeletonWorkflow({baseUrl, environment, jwtToken})
            .then((uuid) => {
                if (!cancelled) {
                    setWorkflowUuid(uuid);
                }
            })
            .catch((createError) => {
                if (!cancelled) {
                    setError(createError instanceof Error ? createError.message : 'Failed to start chat');
                }
            });

        return () => {
            cancelled = true;
        };
    }, [baseUrl, environment, jwtToken]);

    if (error) {
        return <div className={twMerge('p-4 text-sm text-red-600', className)}>{error}</div>;
    }

    if (!workflowUuid) {
        return <div className={twMerge('p-4 text-sm', className)}>Starting…</div>;
    }

    return (
        <div className={twMerge('flex h-full flex-col', className)}>
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <BotMessageSquareIcon className="size-5" />

                        <h4 className="text-sm font-semibold">{title}</h4>
                    </div>

                    {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
                </div>

                <button
                    aria-label="New conversation"
                    className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
                    onClick={handleNewConversation}
                    type="button"
                >
                    <MessageSquareXIcon className="size-4" />
                </button>
            </div>

            <div className="min-h-0 flex-1">
                <EmbeddedChatBoundary>
                    <EmbeddedCopilotRuntimeProvider
                        baseUrl={baseUrl}
                        chatStore={chatStore}
                        environment={environment}
                        jwtToken={jwtToken}
                        onRunFinished={() => {
                            if (!readyFiredRef.current) {
                                readyFiredRef.current = true;

                                onWorkflowReady?.(workflowUuid);
                            }
                        }}
                        systemPrompt={systemPrompt}
                        workflowUuid={workflowUuid}
                    >
                        <WorkflowChatThread dataComponents={embeddedChatDataComponents} suggestions={suggestions} />
                    </EmbeddedCopilotRuntimeProvider>
                </EmbeddedChatBoundary>
            </div>
        </div>
    );
};

export default EmbeddedWorkflowChat;
