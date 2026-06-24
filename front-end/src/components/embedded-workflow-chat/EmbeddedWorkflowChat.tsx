import {useEffect, useRef, useState} from 'react';
import {twMerge} from 'tailwind-merge';

import {createSkeletonWorkflow} from './api';
import {EmbeddedChatConfigContext} from './chat-config-context';
import {DEFAULT_BASE_URL} from './constants';
import {embeddedChatDataComponents} from './dataComponents';
import EmbeddedChatBoundary from './EmbeddedChatBoundary';
import {EmbeddedCopilotRuntimeProvider} from './EmbeddedCopilotRuntimeProvider';
import {createChatStore} from './store';
import {WorkflowChatThread, type WorkflowChatSuggestionI} from './workflow-chat-thread';

export type {WorkflowChatSuggestionI};

export interface EmbeddedWorkflowChatPropsI {
    baseUrl?: string;
    className?: string;
    environment?: 'DEVELOPMENT' | 'PRODUCTION' | 'STAGING';
    jwtToken: string;
    onWorkflowReady?: (workflowUuid: string) => void;
    suggestions?: WorkflowChatSuggestionI[];
    systemPrompt?: string;
}

const EmbeddedWorkflowChat = ({
    baseUrl = DEFAULT_BASE_URL,
    className,
    environment = 'PRODUCTION',
    jwtToken,
    onWorkflowReady,
    suggestions,
    systemPrompt,
}: EmbeddedWorkflowChatPropsI) => {
    const [chatStore] = useState(createChatStore);
    const [workflowUuid, setWorkflowUuid] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const readyFiredRef = useRef(false);
    const skeletonCreatedRef = useRef(false);

    useEffect(() => {
        // Create the skeleton workflow exactly once. The ref latch guards against React StrictMode's
        // double-invoke (default-on in Next.js dev), which would otherwise create two workflows.
        // Note: we deliberately do NOT use a `cancelled` cleanup flag here — combined with the latch it
        // would veto the only request's result (StrictMode's cleanup runs between the two invocations),
        // leaving the chat stuck on "Starting…". setState after unmount is a no-op in React 19.
        if (skeletonCreatedRef.current) {
            return;
        }

        skeletonCreatedRef.current = true;

        createSkeletonWorkflow({baseUrl, environment, jwtToken})
            .then((uuid) => setWorkflowUuid(uuid))
            .catch((createError) =>
                setError(createError instanceof Error ? createError.message : 'Failed to start chat')
            );
    }, [baseUrl, environment, jwtToken]);

    if (error) {
        return <div className={twMerge('p-4 text-sm text-red-600', className)}>{error}</div>;
    }

    if (!workflowUuid) {
        return <div className={twMerge('p-4 text-sm', className)}>Starting…</div>;
    }

    return (
        <div className={twMerge('flex h-full flex-col', className)}>
            <div className="min-h-0 flex-1">
                <EmbeddedChatBoundary>
                    <EmbeddedChatConfigContext.Provider value={{baseUrl, environment, jwtToken}}>
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
                            suggestions={suggestions?.map((suggestion) => ({
                                label: suggestion.label,
                                prompt: suggestion.action,
                                title: suggestion.title,
                            }))}
                            systemPrompt={systemPrompt}
                            workflowUuid={workflowUuid}
                        >
                            <WorkflowChatThread dataComponents={embeddedChatDataComponents} />
                        </EmbeddedCopilotRuntimeProvider>
                    </EmbeddedChatConfigContext.Provider>
                </EmbeddedChatBoundary>
            </div>
        </div>
    );
};

export default EmbeddedWorkflowChat;
