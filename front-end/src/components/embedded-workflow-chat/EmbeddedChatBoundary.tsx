import {Component, type ErrorInfo, type PropsWithChildren, type ReactNode} from 'react';

interface EmbeddedChatBoundaryStateI {
    hasError: boolean;
}

const KNOWN_UNMOUNT_ERROR = 'unmount a fiber that is already unmounted';

/**
 * Error boundary that catches unmount errors from @assistant-ui/react's
 * AssistantRuntimeProviderImpl. The library throws "Tried to unmount a fiber
 * that is already unmounted" when conditionally rendered in React 19.
 *
 * Known unmount errors are silently swallowed (they occur on unmount/navigate-away
 * and are harmless). All other errors are logged and the subtree renders null.
 */
class EmbeddedChatBoundary extends Component<PropsWithChildren, EmbeddedChatBoundaryStateI> {
    state: EmbeddedChatBoundaryStateI = {hasError: false};

    static getDerivedStateFromError(): EmbeddedChatBoundaryStateI {
        return {hasError: true};
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        const isKnownUnmountError = error.message?.includes(KNOWN_UNMOUNT_ERROR);

        if (!isKnownUnmountError) {
            console.error('EmbeddedChatBoundary caught an unexpected error:', error, errorInfo);
        }
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return null;
        }

        return this.props.children;
    }
}

export default EmbeddedChatBoundary;
