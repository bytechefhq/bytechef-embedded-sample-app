export const DEFAULT_BASE_URL = 'https://app.bytechef.io';

// Minimal valid skeleton. The agent overwrites it on the first BUILD turn; it only needs to be a
// definition the create endpoint accepts so we get a workflowUuid to anchor the conversation.
// Keys match ConnectedUserProjectFacadeImpl.DEFAULT_DEFINITION (label, description, inputs, triggers, tasks).
export const SKELETON_WORKFLOW_DEFINITION = JSON.stringify({
    description: '',
    inputs: [],
    label: 'New Workflow',
    tasks: [],
    triggers: [],
});

export const copilotChatUrl = (baseUrl: string, workflowUuid: string): string =>
    `${baseUrl}/api/embedded/v1/automation/workflows/${workflowUuid}/copilot/chat`;

export const createWorkflowUrl = (baseUrl: string): string =>
    `${baseUrl}/api/embedded/v1/automation/workflows`;
