import {useEffect, useRef, useState} from 'react';
import {twMerge} from 'tailwind-merge';

import {createSkeletonWorkflow} from './api';
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
        // Guard against React StrictMode's double-invoke (default-on in Next.js dev):
        // without this latch the effect fires twice and creates two skeleton workflows.
        if (skeletonCreatedRef.current) {
            return;
        }

        skeletonCreatedRef.current = true;

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
                </EmbeddedChatBoundary>
            </div>
        </div>
    );
};

export default EmbeddedWorkflowChat;
